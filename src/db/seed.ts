import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./index";

config({ path: ".env.local" });
const db = getDb();

async function seedHistoryChannel() {
  const [channel] = await db
    .insert(schema.channels)
    .values({
      slug: "time-excavated",
      displayName: "Time Excavated",
      niche: "history",
      youtubeChannelId: "UCSJSdi3FmUJXF0C1ie_VWaA",
      brandVoiceConfig: {
        tone: "curious, cinematic, measured authority",
        // ElevenLabs premade voice "Brian" — chosen by ear against other premade
        // and Voice Library candidates, see project memory for the comparison.
        voiceId: "nPczCjzI2devNBz1zQrb",
        audience: "USA, 25-54, history/documentary viewers",
        framingRules: [
          "Avoid nationalistic 'only X people knew this' framing for non-US-origin topics (e.g. ancient India, lost civilizations) — it alienates a US audience and reads as clickbait.",
          "Frame every topic as a universal mystery or curiosity, not a claim of national pride.",
          "Open with a concrete image or question, never a label like 'in this video we will...'.",
        ],
      },
      visualStyleGuide: {
        colorGrade: "desaturated cinematic",
        typography: "serif headline + sans body",
        motionStyle: "slow Ken Burns pans over archival images and maps",
      },
    })
    .onConflictDoUpdate({
      target: schema.channels.slug,
      set: { updatedAt: new Date() },
    })
    .returning();

  const [nicheTemplate] = await db
    .insert(schema.nicheTemplates)
    .values({
      niche: "history",
      // Longform gets the full 8-beat arc. A short's ~40s / ~90-word budget can't fit all
      // eight without reducing each to a single clause — so shorts use a tighter 4-beat
      // arc (hook -> rising_mystery -> turn -> cta) that still has a real hook and payoff,
      // and drop context/evidence/counterpoint/resolution, which need room to breathe.
      scriptFormula: [
        {
          beat: "hook",
          guidance: "Open with a vivid, concrete image or question that creates mystery within 5 seconds. Never open with 'In this video...'.",
          formats: ["short", "longform"],
        },
        {
          beat: "context",
          guidance: "Establish time, place, and stakes in plain language. Assume no prior knowledge of the period.",
          formats: ["longform"],
        },
        {
          beat: "rising_mystery",
          guidance:
            "Introduce the central anomaly or forgotten fact. Build curiosity with specific, verifiable details, not vague claims. " +
            "On a short, this beat also carries the strongest single piece of evidence — there's no separate evidence beat to lean on.",
          formats: ["short", "longform"],
        },
        {
          beat: "evidence",
          guidance: "Present the strongest verifiable evidence: named artifacts, texts, or archaeological findings with sources.",
          formats: ["longform"],
        },
        {
          beat: "counterpoint",
          guidance: "Fairly state the mainstream historical explanation or skeptical view before contrasting it.",
          formats: ["longform"],
        },
        {
          beat: "turn",
          guidance: "Reveal the twist, reinterpretation, or implication that recontextualizes the story.",
          formats: ["short", "longform"],
        },
        {
          beat: "resolution",
          guidance: "Land on a grounded takeaway. For disputed claims use 'some historians argue' framing rather than asserting certainty.",
          formats: ["longform"],
        },
        {
          beat: "cta",
          guidance:
            "Close with a question that invites comments, plus a soft subscribe prompt. On a short, keep this to one short line.",
          formats: ["short", "longform"],
        },
      ],
      researchPromptTemplate:
        "Research the historical topic: {{topicTitle}}. Gather verifiable facts from primary or academic sources " +
        "(archaeological reports, peer-reviewed history, primary texts, museum/archive records). For every claim, " +
        "record the source name, source URL, and a short excerpt. Prefer at least two independent sources per major claim. " +
        "Explicitly flag claims that are disputed among historians or rely on a single source, so they can be routed to human review " +
        "rather than stated as settled fact. Avoid framing any non-US civilization's achievements as exclusive national pride — " +
        "frame them as part of a shared human story of discovery and mystery.",
      scriptPromptTemplate:
        "Write a {{format}} documentary-style narration for the topic: {{topicTitle}}, targeting a USA audience on the " +
        "'Time Excavated' channel. Use the provided research brief and beat structure ({{scriptFormula}}). " +
        "Tone: curious, cinematic, measured authority — never sensational or conspiratorial. " +
        "Hook the viewer in the first 5 seconds with a concrete image or question, not a topic label. " +
        "Do not frame any culture's history as 'secrets only they knew' — frame discoveries as universal human mysteries. " +
        "Mark every factual claim so it can be traced back to a research citation for fact-checking. " +
        "Visual pacing target: {{pacingGuidance}}. For each beat, plan the shots BEFORE writing any narration: " +
        "decide how many shots the beat needs at 10-14 words each (~5-6 seconds at this channel's measured " +
        "narration pace) — 18 words (~8 seconds) is an absolute ceiling, not a comfortable target — then compose " +
        "each shot's own narration directly at that length. Do not write the beat as one flowing passage and " +
        "split it into shots afterward, since that produces shots sized to sentences instead of to the pacing " +
        "target. A beat is a story unit, a shot is a single visual cut, and most beats need 3+ shots, not one " +
        "held for the whole beat. Shot boundaries do NOT need to align with sentence boundaries — a long thought " +
        "(20+ words) must be composed as two or three shots, each written at the target length, with the " +
        "narration reading as one continuous line while the visual cuts partway through it. Never let 'this is " +
        "one grammatical sentence' be the reason a shot runs long. " +
        "Target length: approximately {{targetWordCount}} words of spoken narration total (~{{targetLengthSec}} " +
        "seconds at this channel's measured narration pace). Stay close to this across the whole script. If you " +
        "are running short of the target, close the gap by adding MORE shots per beat with more supporting " +
        "detail, examples, and evidence — never by writing longer individual shots past the per-shot ceiling " +
        "described above; shot length and total length are independent targets. For a " +
        "'short' this is a hard ceiling for YouTube Shorts feed eligibility, not a style preference, so do not add " +
        "extra beats, sentences, or padding to run longer than the target. For a 'short' specifically: budget " +
        "roughly {{targetWordCount}} words divided evenly across the beats above, keep each beat to 1-2 short " +
        "sentences, and prefer cutting detail from the guidance over exceeding the word budget.",
      factcheckPromptTemplate:
        "Extract every factual claim from this script: {{fullNarrationText}}. For each claim, assign a verdict — " +
        "'supported', 'unsupported', 'disputed', or 'needs_human_judgment' — based on the attached research citations. " +
        "Require at least one citation (source URL, source name, excerpt) for any 'supported' verdict. " +
        "Route 'disputed' and 'needs_human_judgment' claims to human review before the script can move past awaiting_review status.",
      visualBeatGuidance: {
        tone: "cinematic documentary, muted color grade",
        imageSources: ["wikimedia", "internet_archive", "loc", "openai_image"],
        pacing: "one visual change every 3-5 seconds for shorts, 5-8 seconds for longform",
      },
    })
    .onConflictDoUpdate({
      target: schema.nicheTemplates.niche,
      // Re-running the seed is how prompt/formula edits actually reach an existing
      // template row — set: { updatedAt } alone (the old behavior) silently discarded
      // every content change on conflict, so editing this file did nothing.
      set: {
        scriptFormula: sql`excluded.script_formula`,
        researchPromptTemplate: sql`excluded.research_prompt_template`,
        scriptPromptTemplate: sql`excluded.script_prompt_template`,
        factcheckPromptTemplate: sql`excluded.factcheck_prompt_template`,
        visualBeatGuidance: sql`excluded.visual_beat_guidance`,
        defaultLongformLengthSec: sql`excluded.default_longform_length_sec`,
        defaultShortLengthSec: sql`excluded.default_short_length_sec`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return { channel, nicheTemplate };
}

const starterTopics: Array<{ titleWorking: string; format: "short" | "longform" }> = [
  { titleWorking: "The Baghdad Battery: Did Ancient Iraq Have Electricity?", format: "short" },
  { titleWorking: "Why the Indus Valley Civilization Vanished Without a Trace", format: "short" },
  { titleWorking: "The Ancient 'Computer' Found in a Roman Shipwreck", format: "short" },
  { titleWorking: "The Library That Took Centuries of Knowledge With It", format: "short" },
  { titleWorking: "The City Found Underwater After 9,000 Years", format: "short" },
  { titleWorking: "Ancient Surgery: What They Could Do 2,000 Years Ago", format: "short" },
  { titleWorking: "Why Archaeologists Are Afraid of Göbekli Tepe", format: "short" },
  { titleWorking: "Ancient Egypt's Astronomy Was Centuries Ahead", format: "short" },
  { titleWorking: "Did Humans Discover Electricity Long Before Edison?", format: "short" },
  { titleWorking: "The Single Event That Quietly Rewrote History", format: "short" },
  { titleWorking: "The Unsolved Mystery of the Antikythera Mechanism", format: "longform" },
  { titleWorking: "The Buried Secrets of the Indus Valley Civilization", format: "longform" },
  { titleWorking: "Why Ancient Egypt Really Built the Pyramids", format: "longform" },
  { titleWorking: "The Lost Roman Technology Historians Still Can't Explain", format: "longform" },
  { titleWorking: "The Forgotten Empire Erased From Your Textbooks", format: "longform" },
];

async function seedStarterTopics(channelId: string, nicheTemplateId: string) {
  const existing = await db.query.topics.findMany({ where: (t, { eq }) => eq(t.channelId, channelId) });
  const existingTitles = new Set(existing.map((t) => t.titleWorking));

  const rows = starterTopics
    .filter((t) => !existingTitles.has(t.titleWorking))
    .map((t, i) => ({
      channelId,
      nicheTemplateId,
      titleWorking: t.titleWorking,
      format: t.format,
      status: "backlog" as const,
      source: "manual" as const,
      priorityScore: String(starterTopics.length - i),
      notes: "Starter calendar from initial content strategy session.",
    }));

  if (rows.length === 0) return [];
  return db.insert(schema.topics).values(rows).returning();
}

async function main() {
  const { channel, nicheTemplate } = await seedHistoryChannel();
  console.log(`Channel ready: ${channel.displayName} (${channel.id})`);
  console.log(`Niche template ready: ${nicheTemplate.niche} (${nicheTemplate.id})`);

  const inserted = await seedStarterTopics(channel.id, nicheTemplate.id);
  console.log(`Inserted ${inserted.length} new starter topics (skipped duplicates already in backlog).`);
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
