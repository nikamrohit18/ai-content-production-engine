import { generateText, Output } from "ai";
import { z } from "zod";
import { RESEARCH_MODEL } from "./models";

const MAX_FETCHED_CHARS = 4000;
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/g;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  const cleaned = matches.map((m) => m.replace(/[.,;:)\]]+$/, ""));
  return Array.from(new Set(cleaned));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlExcerpt(url: string): Promise<{ url: string; excerpt: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    const raw = await res.text();
    const excerpt = stripHtml(raw).slice(0, MAX_FETCHED_CHARS);
    return excerpt ? { url, excerpt } : null;
  } catch (error) {
    console.warn(`[manualIntake] failed to fetch ${url}`, error);
    return null;
  }
}

const intakeOutputSchema = z.object({
  selectedHook: z
    .string()
    .describe(
      "The single strongest hook for this video. If the raw notes offer multiple candidate hooks, pick the one most " +
        "likely to stop a scroll and tighten its wording if needed. If only one hook (or none, just facts) is given, " +
        "either use it as-is or write the strongest hook the material supports.",
    ),
  hookRationale: z.string().describe("One sentence on why this hook was chosen over the alternatives (or why it works, if there was only one)."),
  selectedOutline: z
    .string()
    .describe(
      "The single strongest narrative outline/structure for this video, written out in full as an ordered list of " +
        "beats or sections. If the raw notes offer multiple candidate outlines, pick the strongest one. If only one " +
        "(or none) is given, use it or construct the strongest outline the material supports.",
    ),
  outlineRationale: z.string().describe("One sentence on why this outline was chosen over the alternatives (or why it works, if there was only one)."),
  distilledBrief: z
    .string()
    .describe(
      "A clean, decisive brief synthesizing the chosen hook, chosen outline, and any concrete facts/leads/quotes " +
        "from the raw input and any fetched reference sources — written as prose a researcher would want to start " +
        "from. No meta-commentary about 'candidate 1 vs candidate 2', just the distilled content itself.",
    ),
});

export type ManualTopicIntake = z.infer<typeof intakeOutputSchema> & {
  sourceUrls: string[];
  modelUsed: string;
  generationId: string;
};

/**
 * Producers often paste in a raw blob mixing several candidate hooks, several
 * candidate outlines, plain facts, and reference URLs. This distills that into
 * a single decisive brief (picking the strongest hook/outline rather than
 * leaving that judgment call to the research step) so draftResearchBrief gets
 * clean input either way, regardless of how the raw notes were shaped.
 */
export async function analyzeManualTopicSubmission(
  titleWorking: string,
  rawContext: string,
): Promise<ManualTopicIntake> {
  const urls = extractUrls(rawContext);
  const fetched = (await Promise.all(urls.map(fetchUrlExcerpt))).filter(
    (r): r is { url: string; excerpt: string } => r !== null,
  );

  const sourceBlock = fetched.length
    ? fetched.map((f) => `Source (${f.url}):\n${f.excerpt}`).join("\n\n---\n\n")
    : "";

  const prompt = [
    `Working title: ${titleWorking}`,
    "",
    "The following is raw, unedited notes from a human producer. It may contain multiple candidate hooks, multiple " +
      "candidate outlines, plain facts, and/or reference URLs, all mixed together in free text:",
    "---",
    rawContext,
    "---",
    sourceBlock ? `\nFetched content from referenced URLs:\n${sourceBlock}` : "",
    "\nPick the single strongest hook and the single strongest outline from what's given, then produce a distilled brief.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateText({
    model: RESEARCH_MODEL,
    prompt,
    output: Output.object({ schema: intakeOutputSchema }),
  });

  const generationId = result.providerMetadata?.gateway?.generationId as string | undefined;
  if (!generationId) throw new Error("No gateway generationId returned for manual topic intake generation");

  return { ...result.output, sourceUrls: fetched.map((f) => f.url), modelUsed: RESEARCH_MODEL, generationId };
}
