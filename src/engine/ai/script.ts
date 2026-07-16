import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { renderTemplate } from "./template";
import { SCRIPT_MODEL } from "./models";

/**
 * Scripts generated before narrationText's schema description forbade it
 * can still contain "[Source: ...]"-style citation artifacts or markdown
 * emphasis asterisks that never made it into fullNarrationText — strip
 * them so narrationText reliably matches as a substring of the full text
 * (needed for voiceover timestamp alignment) and so it's clean for on-screen
 * captions.
 */
export function cleanNarrationText(text: string): string {
  return text.replace(/\s*\[[^\]]*\]/g, "").replace(/\*/g, "").trim();
}

export type DerivedShot = {
  beatIndex: number;
  shotIndex: number;
  beatName: string;
  narrationSpan: string;
  imageGenPrompt: string | null;
  videoGenPrompt: string | null;
};

/**
 * Flattens beatStructure into individual visual shots. New scripts carry
 * per-beat visualBeats (the pacing-driven shot breakdown); scripts saved
 * before that pivot fall back to one implicit shot spanning the whole beat,
 * using the beat's own legacy imageGenPrompt/videoGenPrompt — so voiceover
 * timing and the production package keep working for old scripts too.
 */
export function deriveShots(
  beatStructure: Array<{
    beatName: string;
    narrationText: string;
    imageGenPrompt?: string;
    videoGenPrompt?: string;
    visualBeats?: Array<{ narrationSpan: string; imageGenPrompt: string; videoGenPrompt?: string }>;
  }>,
): DerivedShot[] {
  return beatStructure.flatMap((beat, beatIndex) => {
    const shots = beat.visualBeats?.length
      ? beat.visualBeats
      : [{ narrationSpan: beat.narrationText, imageGenPrompt: beat.imageGenPrompt, videoGenPrompt: beat.videoGenPrompt }];
    return shots.map((shot, shotIndex) => ({
      beatIndex,
      shotIndex,
      beatName: beat.beatName,
      narrationSpan: shot.narrationSpan,
      imageGenPrompt: shot.imageGenPrompt ?? null,
      videoGenPrompt: shot.videoGenPrompt ?? null,
    }));
  });
}

// Measured from this channel's actual ElevenLabs voice output (494 words / 218.1s
// on a real generated script) rather than a generic TTS estimate — documentary-pace
// narration on this voice runs slower than typical 150wpm reading-aloud averages.
export const WORDS_PER_MINUTE = 135;

const scriptOutputSchema = z.object({
  beatStructure: z.array(
    z.object({
      beatName: z.string(),
      visualCue: z.string(),
      estDurationSec: z
        .number()
        .describe(
          "This beat's total spoken duration in seconds. Decide this FIRST, before writing any narration — it " +
            "determines how many shots the beat needs (roughly one shot per 5-6 seconds, so a 20s beat needs " +
            "3-4 shots, not 1-2).",
        ),
      imageSearchQuery: z
        .string()
        .describe(
          "A VERY SHORT search query (2-3 words max) for finding an archival photo on Wikimedia Commons — just the core proper-noun entity name (e.g. 'Antikythera mechanism', 'Göbekli Tepe'), never a descriptive phrase. Commons search matches literally on title words, not semantically — extra qualifying words reduce match rate rather than improve it. Never use the clickbait-style topic title or video phrasing.",
        ),
      visualBeats: z
        .array(
          z.object({
            narrationSpan: z
              .string()
              .describe(
                "This shot's own spoken narration — compose it directly at this length; never write the beat as one flowing passage first and carve shots out of it afterward, and never let 'this is one grammatical sentence' be a reason to keep a span whole. Pure spoken narration only, exactly as it should be read aloud — never include bracketed citations like '[Source: ...]', markdown emphasis asterisks, or any annotation not meant to be spoken. TARGET 10-14 words per shot, HARD CEILING 18 words — at this channel's measured narration pace (135 words/minute, ~2.25 words/sec), 18 words is already a full 8 seconds, so treat 18 as an absolute maximum, not a comfortable target. Aim for the 10-14 range by default. If a thought needs more than 18 words, that's two or three shots, each written at the target length, not one long shot. All shots in this beat concatenate in order (joined by a single space) into the beat's full narration, so write each shot as a natural continuation of the one before it — the joined result must read as fluent continuous prose, not choppy fragments, even though it was composed shot-by-shot.",
              ),
            imageGenPrompt: z
              .string()
              .describe(
                "A ready-to-paste prompt for an AI image generator (Midjourney/Nano Banana/etc.) depicting THIS shot's narrationSpan specifically, not the whole beat and not a search query. Describe the specific scene, subject, setting, lighting, and camera framing in concrete visual detail. Match the channel's desaturated cinematic documentary look (muted color grade, slow/measured mood, archival-photo realism rather than fantasy or cartoon style) unless this shot calls for a clear diagram/infographic instead. Must depict this shot's specific narration, not a generic restatement of the topic or beat.",
              ),
            videoGenPrompt: z
              .string()
              .optional()
              .describe(
                "Optional — only include for shots where subtle motion would meaningfully add to the scene (e.g. dust drifting, slow camera dolly/pan, flickering torchlight). A prompt for an AI video generator describing the motion/camera movement specifically, building on this shot's imageGenPrompt rather than re-describing it from scratch. Omit entirely for shots that are fine as a still image.",
              ),
          }),
        )
        .min(1)
        .describe(
          "Plan this beat's shots BEFORE writing any narration: given estDurationSec, decide how many shots this beat needs at ~10-14 words (~5-6 seconds) each — NEVER more than 18 words (~8 seconds) per shot — then write each shot's own narration directly at that length as the primary unit. Do not write the beat as a full passage first and split it afterward, and do not treat 18 words as a comfortable target; aim lower, at 10-14. A beat is a story unit; a shot is a single visual cut, independent of sentence boundaries. Most beats need 3+ shots; a single-shot beat should be rare, not the default. IMPORTANT: the per-shot word ceiling is not a lever for hitting the script's overall target length — if the total narration is running short, add MORE shots with more supporting detail, examples, and evidence to this beat, never lengthen individual shots past the ceiling to compensate.",
        ),
    }),
  ),
  thumbnailPrompts: z
    .array(
      z.object({
        concept: z
          .string()
          .describe(
            "A ready-to-paste prompt for an AI image generator depicting a single, high-contrast, attention-grabbing thumbnail concept for this whole video — built around its central hook/mystery, not a recap of the plot. Concrete visual subject, composition, lighting.",
          ),
        textOverlay: z.string().describe("Short punchy overlay text for the thumbnail, 3-6 words max, in the video's own hook language — not a generic label."),
      }),
    )
    .length(3)
    .describe("Exactly 3 distinct thumbnail concepts for this video, each a different visual angle on the hook."),
  seoTags: z
    .array(z.string())
    .min(8)
    .max(12)
    .describe(
      "8-12 hidden YouTube Studio 'Tags' — viewers never see these, only used for search/recommendation matching. " +
        "2-3 word phrases a real viewer would type, not hashtags and not single generic words. Combined length " +
        "must stay well under 500 characters total.",
    ),
  hashtags: z
    // Was restricted to ASCII [A-Za-z0-9], which sounds right but isn't the actual
    // constraint that matters for YouTube (any non-whitespace token starting with #
    // works) — a real generation failed this because the model wrote a Cyrillic "о"
    // homoglyph in an otherwise-English word, hard-failing the whole script for a
    // cosmetic non-issue. Only whitespace/a second "#" actually breaks a hashtag.
    .array(z.string().regex(/^#[^\s#]+$/, "must start with # and contain no spaces or a second #"))
    .min(3)
    .max(5)
    .describe(
      "3-5 visible YouTube hashtags for the description (not the title) — each must start with '#' and contain " +
        "no spaces (e.g. '#BadaImambara', never '#Bada Imambara'). Specific to this video's actual subject, not " +
        "generic ('#history' is fine as one of the 3-5, but not all of them).",
    ),
  seoDescription: z
    .string()
    .describe(
      "A real YouTube video description: 2-3 sentences that hook a viewer deciding whether to watch and help " +
        "search, in plain language — not a beat-by-beat recap of the script. Do not include hashtags or source " +
        "links here; those are appended separately.",
    ),
});

export type ScriptDraft = {
  beatStructure: Array<{
    beatName: string;
    narrationText: string;
    visualCue: string;
    estDurationSec: number;
    imageSearchQuery: string;
    visualBeats: Array<{
      narrationSpan: string;
      imageGenPrompt: string;
      videoGenPrompt?: string;
    }>;
  }>;
  fullNarrationText: string;
  thumbnailPrompts: Array<{ concept: string; textOverlay: string }>;
  seoTags: string[];
  hashtags: string[];
  seoDescription: string;
  modelUsed: string;
  generationId: string;
};

export async function draftScript(topicId: string, briefId: string): Promise<ScriptDraft> {
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const nicheTemplate = await db.query.nicheTemplates.findFirst({
    where: (nt, { eq }) => eq(nt.id, topic.nicheTemplateId),
  });
  if (!nicheTemplate) throw new Error(`Niche template ${topic.nicheTemplateId} not found for topic ${topicId}`);

  const brief = await db.query.researchBriefs.findFirst({ where: (rb, { eq }) => eq(rb.id, briefId) });
  if (!brief) throw new Error(`Research brief ${briefId} not found`);

  // visualBeatGuidance.pacing drives how finely the model splits each beat into
  // shots (see visualBeats below) — fall back to a sane default for niches that
  // predate this field rather than leaving the prompt with an empty placeholder.
  const pacingGuidance =
    (nicheTemplate.visualBeatGuidance as { pacing?: string } | null)?.pacing ?? "one visual change every 5-8 seconds";

  const targetLengthSec = topic.format === "short" ? nicheTemplate.defaultShortLengthSec : nicheTemplate.defaultLongformLengthSec;
  const targetWordCount = Math.round((targetLengthSec / 60) * WORDS_PER_MINUTE);

  // Beats without a formats tag apply to both (backward compat for templates saved
  // before this field existed) — a short's word budget can't fit the full longform
  // arc, so it gets whichever subset of beats is actually tagged for "short".
  const applicableBeats = nicheTemplate.scriptFormula.filter((b) => !b.formats || b.formats.includes(topic.format));

  const rendered = renderTemplate(nicheTemplate.scriptPromptTemplate, {
    topicTitle: topic.titleWorking,
    format: topic.format,
    scriptFormula: JSON.stringify(applicableBeats),
    pacingGuidance,
    targetLengthSec: String(targetLengthSec),
    targetWordCount: String(targetWordCount),
  });

  const sourcesList = brief.sources
    .map((s) => `- ${s.sourceName} (${s.sourceUrl}): ${s.excerpt}`)
    .join("\n");
  const prompt = `${rendered}\n\nResearch brief:\n${brief.content}\n\nSources:\n${sourcesList}`;

  const result = await generateText({
    model: SCRIPT_MODEL,
    prompt,
    output: Output.object({ schema: scriptOutputSchema }),
  });

  const generationId = result.providerMetadata?.gateway?.generationId as string | undefined;
  if (!generationId) throw new Error("No gateway generationId returned for script generation");

  // narrationText/fullNarrationText are derived from the shots rather than generated
  // independently by the model — shot narration is now the single source of truth for
  // spoken content, which both guarantees the two always agree (no more substring-match
  // drift) and forces the model to compose narration shot-by-shot at the target length
  // instead of writing full prose first and carving shots out of it after the fact.
  const beatStructure = result.output.beatStructure.map((beat) => ({
    ...beat,
    narrationText: beat.visualBeats.map((shot) => shot.narrationSpan).join(" "),
  }));
  const fullNarrationText = beatStructure.map((beat) => beat.narrationText).join(" ");

  // A soft check, not a retry loop — flags drift for follow-up rather than blocking
  // the draft, since the fact-check/review step is the real gate before this ships.
  const actualWordCount = fullNarrationText.trim().split(/\s+/).filter(Boolean).length;
  if (Math.abs(actualWordCount - targetWordCount) / targetWordCount > 0.3) {
    console.warn(
      `[draftScript] topic ${topicId}: narration is ${actualWordCount} words, target was ${targetWordCount} ` +
        `(±30% band) for a ${targetLengthSec}s ${topic.format}`,
    );
  }

  return { ...result.output, beatStructure, fullNarrationText, modelUsed: SCRIPT_MODEL, generationId };
}

export async function saveScript(
  topicId: string,
  draft: Omit<ScriptDraft, "generationId">,
  costUsd: number,
): Promise<{ scriptId: string }> {
  const db = getDb();

  const latest = await db.query.scripts.findFirst({
    where: (s, { eq }) => eq(s.topicId, topicId),
    orderBy: (s, { desc }) => [desc(s.version)],
  });

  const wordCount = draft.fullNarrationText.trim().split(/\s+/).filter(Boolean).length;

  const [row] = await db
    .insert(schema.scripts)
    .values({
      topicId,
      version: (latest?.version ?? 0) + 1,
      beatStructure: draft.beatStructure,
      fullNarrationText: draft.fullNarrationText,
      thumbnailPrompts: draft.thumbnailPrompts,
      seoTags: draft.seoTags,
      hashtags: draft.hashtags,
      seoDescription: draft.seoDescription,
      wordCount,
      modelUsed: draft.modelUsed,
      generationCostUsd: String(costUsd),
    })
    .returning();
  return { scriptId: row.id };
}
