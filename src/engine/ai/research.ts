import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { renderTemplate } from "./template";
import { RESEARCH_MODEL } from "./models";

const researchOutputSchema = z.object({
  content: z.string(),
  sources: z.array(
    z.object({
      sourceUrl: z.string(),
      sourceName: z.string(),
      excerpt: z.string(),
    }),
  ),
  disputedClaims: z.array(z.string()),
});

export type ResearchDraft = {
  content: string;
  sources: Array<{ sourceUrl: string; sourceName: string; excerpt: string }>;
  disputedClaims: string[];
  modelUsed: string;
  generationId: string;
};

export async function draftResearchBrief(topicId: string): Promise<ResearchDraft> {
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const nicheTemplate = await db.query.nicheTemplates.findFirst({
    where: (nt, { eq }) => eq(nt.id, topic.nicheTemplateId),
  });
  if (!nicheTemplate) throw new Error(`Niche template ${topic.nicheTemplateId} not found for topic ${topicId}`);

  const basePrompt = renderTemplate(nicheTemplate.researchPromptTemplate, {
    topicTitle: topic.titleWorking,
  });
  // topic.notes carries either a trend-sourced blurb or (for manually-entered
  // topics) the distilled hook/outline/brief from analyzeManualTopicSubmission —
  // appending it gives research a head start instead of starting from the title alone.
  const prompt = topic.notes ? `${basePrompt}\n\nAdditional context provided with this topic:\n${topic.notes}` : basePrompt;

  const result = await generateText({
    model: RESEARCH_MODEL,
    prompt,
    output: Output.object({ schema: researchOutputSchema }),
  });

  const generationId = result.providerMetadata?.gateway?.generationId as string | undefined;
  if (!generationId) throw new Error("No gateway generationId returned for research generation");

  return { ...result.output, modelUsed: RESEARCH_MODEL, generationId };
}

export async function saveResearchBrief(
  topicId: string,
  draft: Omit<ResearchDraft, "generationId">,
  costUsd: number,
): Promise<{ briefId: string }> {
  const db = getDb();
  const [row] = await db
    .insert(schema.researchBriefs)
    .values({
      topicId,
      content: draft.content,
      sources: draft.sources,
      disputedClaims: draft.disputedClaims,
      modelUsed: draft.modelUsed,
      generationCostUsd: String(costUsd),
    })
    .returning();
  return { briefId: row.id };
}
