import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { renderTemplate } from "./template";
import { SCRIPT_MODEL } from "./models";

const scriptOutputSchema = z.object({
  beatStructure: z.array(
    z.object({
      beatName: z.string(),
      narrationText: z.string(),
      visualCue: z.string(),
      estDurationSec: z.number(),
    }),
  ),
  fullNarrationText: z.string(),
});

export type ScriptDraft = {
  beatStructure: Array<{ beatName: string; narrationText: string; visualCue: string; estDurationSec: number }>;
  fullNarrationText: string;
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
      wordCount,
      modelUsed: draft.modelUsed,
      generationCostUsd: String(costUsd),
    })
    .returning();
  return { scriptId: row.id };
}
