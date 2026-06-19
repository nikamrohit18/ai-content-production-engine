import { FatalError } from "workflow";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { draftResearchBrief, saveResearchBrief, type ResearchDraft } from "@/engine/ai/research";
import { draftScript, saveScript, type ScriptDraft } from "@/engine/ai/script";
import { draftFactCheck, saveFactCheck, type FactCheckDraft } from "@/engine/ai/factcheck";
import { recordGenerationCost } from "@/engine/cost/recordGeneration";

type TopicStatus = (typeof schema.topicStatusEnum.enumValues)[number];

function rethrowNotFoundAsFatal(error: unknown): never {
  if (error instanceof Error && error.message.includes("not found")) {
    throw new FatalError(error.message);
  }
  throw error;
}

export async function generateResearchStep(topicId: string): Promise<ResearchDraft> {
  "use step";
  try {
    return await draftResearchBrief(topicId);
  } catch (error) {
    rethrowNotFoundAsFatal(error);
  }
}
generateResearchStep.maxRetries = 2;

export async function saveResearchStep(
  topicId: string,
  channelId: string,
  draft: ResearchDraft,
): Promise<{ briefId: string }> {
  "use step";
  const costUsd = await recordGenerationCost({
    channelId,
    topicId,
    generationId: draft.generationId,
    modelUsed: draft.modelUsed,
    category: "llm_tokens",
  });
  return saveResearchBrief(topicId, draft, costUsd);
}

export async function generateScriptStep(topicId: string, briefId: string): Promise<ScriptDraft> {
  "use step";
  try {
    return await draftScript(topicId, briefId);
  } catch (error) {
    rethrowNotFoundAsFatal(error);
  }
}
generateScriptStep.maxRetries = 2;

export async function saveScriptStep(
  topicId: string,
  channelId: string,
  draft: ScriptDraft,
): Promise<{ scriptId: string }> {
  "use step";
  const costUsd = await recordGenerationCost({
    channelId,
    topicId,
    generationId: draft.generationId,
    modelUsed: draft.modelUsed,
    category: "llm_tokens",
  });
  return saveScript(topicId, draft, costUsd);
}

export async function generateFactCheckStep(scriptId: string): Promise<FactCheckDraft> {
  "use step";
  try {
    return await draftFactCheck(scriptId);
  } catch (error) {
    rethrowNotFoundAsFatal(error);
  }
}
generateFactCheckStep.maxRetries = 2;

export async function saveFactCheckStep(
  scriptId: string,
  channelId: string,
  topicId: string,
  draft: FactCheckDraft,
): Promise<{ factCheckIds: string[] }> {
  "use step";
  await recordGenerationCost({
    channelId,
    topicId,
    generationId: draft.generationId,
    modelUsed: draft.modelUsed,
    category: "llm_tokens",
  });
  return saveFactCheck(scriptId, draft);
}

export async function setTopicStatusStep(topicId: string, status: TopicStatus): Promise<void> {
  "use step";
  const db = getDb();
  await db.update(schema.topics).set({ status, updatedAt: new Date() }).where(eq(schema.topics.id, topicId));
}
