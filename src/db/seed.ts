import { config } from "dotenv";
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
      scriptFormula: [
        { beat: "hook", guidance: "Open with a vivid, concrete image or question that creates mystery within 5 seconds. Never open with 'In this video...'." },
        { beat: "context", guidance: "Establish time, place, and stakes in plain language. Assume no prior knowledge of the period." },
        { beat: "rising_mystery", guidance: "Introduce the central anomaly or forgotten fact. Build curiosity with specific, verifiable details, not vague claims." },
        { beat: "evidence", guidance: "Present the strongest verifiable evidence: named artifacts, texts, or archaeological findings with sources." },
        { beat: "counterpoint", guidance: "Fairly state the mainstream historical explanation or skeptical view before contrasting it." },
        { beat: "turn", guidance: "Reveal the twist, reinterpretation, or implication that recontextualizes the story." },
        { beat: "resolution", guidance: "Land on a grounded takeaway. For disputed claims use 'some historians argue' framing rather than asserting certainty." },
        { beat: "cta", guidance: "Close with a question that invites comments, plus a soft subscribe prompt." },
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
        "Mark every factual claim so it can be traced back to a research citation for fact-checking.",
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
      set: { updatedAt: new Date() },
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
