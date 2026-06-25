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

const scriptOutputSchema = z.object({
  beatStructure: z.array(
    z.object({
      beatName: z.string(),
      narrationText: z
        .string()
        .describe(
          "Pure spoken narration only, exactly as it should be read aloud — never include bracketed citations " +
            "like '[Source: ...]', markdown emphasis asterisks, or any annotation not meant to be spoken. Must " +
            "appear verbatim as a substring of fullNarrationText, in beat order.",
        ),
      visualCue: z.string(),
      estDurationSec: z.number(),
      imageSearchQuery: z
        .string()
        .describe(
          "A VERY SHORT search query (2-3 words max) for finding an archival photo on Wikimedia Commons — just the core proper-noun entity name (e.g. 'Antikythera mechanism', 'Göbekli Tepe'), never a descriptive phrase. Commons search matches literally on title words, not semantically — extra qualifying words reduce match rate rather than improve it. Never use the clickbait-style topic title or video phrasing.",
        ),
      imageGenPrompt: z
        .string()
        .describe(
          "A ready-to-paste prompt for an AI image generator (Midjourney/Nano Banana/etc.) depicting THIS beat's narration, not a search query. Describe the specific scene, subject, setting, lighting, and camera framing in concrete visual detail. Match the channel's desaturated cinematic documentary look (muted color grade, slow/measured mood, archival-photo realism rather than fantasy or cartoon style) unless the beat itself calls for a clear diagram/infographic instead. Must depict this beat's specific content, not a generic restatement of the topic.",
        ),
      videoGenPrompt: z
        .string()
        .optional()
        .describe(
          "Optional — only include for beats where subtle motion would meaningfully add to the scene (e.g. dust drifting, slow camera dolly/pan, flickering torchlight). A prompt for an AI video generator describing the motion/camera movement specifically, building on imageGenPrompt's scene rather than re-describing it from scratch. Omit entirely for beats that are fine as a still image.",
        ),
    }),
  ),
  fullNarrationText: z.string(),
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
});

export type ScriptDraft = {
  beatStructure: Array<{
    beatName: string;
    narrationText: string;
    visualCue: string;
    estDurationSec: number;
    imageSearchQuery: string;
    imageGenPrompt: string;
    videoGenPrompt?: string;
  }>;
  fullNarrationText: string;
  thumbnailPrompts: Array<{ concept: string; textOverlay: string }>;
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

  const rendered = renderTemplate(nicheTemplate.scriptPromptTemplate, {
    topicTitle: topic.titleWorking,
    format: topic.format,
    scriptFormula: JSON.stringify(nicheTemplate.scriptFormula),
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

  return { ...result.output, modelUsed: SCRIPT_MODEL, generationId };
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
      wordCount,
      modelUsed: draft.modelUsed,
      generationCostUsd: String(costUsd),
    })
    .returning();
  return { scriptId: row.id };
}
