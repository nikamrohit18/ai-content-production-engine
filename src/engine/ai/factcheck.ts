import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { renderTemplate } from "./template";
import { FACTCHECK_MODEL } from "./models";

const factCheckOutputSchema = z.object({
  claims: z.array(
    z.object({
      claimText: z.string(),
      verdict: z.enum(["supported", "unsupported", "disputed", "needs_human_judgment"]),
      confidence: z.number().min(0).max(1).optional(),
      citations: z.array(
        z.object({
          sourceUrl: z.string(),
          sourceName: z.string(),
          excerpt: z.string(),
        }),
      ),
    }),
  ),
});

export type FactCheckDraft = {
  claims: Array<{
    claimText: string;
    verdict: "supported" | "unsupported" | "disputed" | "needs_human_judgment";
    confidence?: number;
    citations: Array<{ sourceUrl: string; sourceName: string; excerpt: string }>;
  }>;
  modelUsed: string;
  generationId: string;
};

export async function draftFactCheck(scriptId: string): Promise<FactCheckDraft> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const nicheTemplateRow = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!nicheTemplateRow) throw new Error(`Topic ${script.topicId} not found for script ${scriptId}`);

  const nicheTemplate = await db.query.nicheTemplates.findFirst({
    where: (nt, { eq }) => eq(nt.id, nicheTemplateRow.nicheTemplateId),
  });
  if (!nicheTemplate) throw new Error(`Niche template ${nicheTemplateRow.nicheTemplateId} not found`);

  const brief = await db.query.researchBriefs.findFirst({
    where: (rb, { eq }) => eq(rb.topicId, script.topicId),
    orderBy: (rb, { desc }) => [desc(rb.createdAt)],
  });

  const rendered = renderTemplate(nicheTemplate.factcheckPromptTemplate, {
    fullNarrationText: script.fullNarrationText,
  });

  const sourcesList = brief
    ? brief.sources.map((s) => `- ${s.sourceName} (${s.sourceUrl}): ${s.excerpt}`).join("\n")
    : "(no research brief sources available)";
  const prompt = `${rendered}\n\nResearch brief sources for grounding:\n${sourcesList}`;

  const result = await generateText({
    model: FACTCHECK_MODEL,
    prompt,
    output: Output.object({ schema: factCheckOutputSchema }),
  });

  const generationId = result.providerMetadata?.gateway?.generationId as string | undefined;
  if (!generationId) throw new Error("No gateway generationId returned for fact-check generation");

  return { ...result.output, modelUsed: FACTCHECK_MODEL, generationId };
}

export async function saveFactCheck(
  scriptId: string,
  draft: Omit<FactCheckDraft, "generationId">,
): Promise<{ factCheckIds: string[] }> {
  const db = getDb();
  const rows = await db
    .insert(schema.factChecks)
    .values(
      draft.claims.map((c) => ({
        scriptId,
        claimText: c.claimText,
        verdict: c.verdict,
        confidence: c.confidence != null ? String(c.confidence) : null,
        citations: c.citations,
        modelUsed: draft.modelUsed,
      })),
    )
    .returning();
  return { factCheckIds: rows.map((r) => r.id) };
}
