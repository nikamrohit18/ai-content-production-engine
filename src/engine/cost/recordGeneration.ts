import { gateway } from "ai";
import { getDb, schema } from "@/db";

type CostProvider = (typeof schema.costProviderEnum.enumValues)[number];

function mapModelToProvider(modelUsed: string): CostProvider {
  if (modelUsed.startsWith("anthropic/")) return "anthropic";
  if (modelUsed.startsWith("openai/")) return "openai_text";
  return "other";
}

export async function recordGenerationCost(args: {
  channelId: string;
  topicId: string;
  generationId: string;
  modelUsed: string;
  category: "llm_tokens";
}): Promise<number> {
  const info = await gateway.getGenerationInfo({ id: args.generationId });
  const db = getDb();
  await db.insert(schema.costLedger).values({
    channelId: args.channelId,
    topicId: args.topicId,
    provider: mapModelToProvider(args.modelUsed),
    category: args.category,
    quantity: String(info.promptTokens + info.completionTokens),
    totalCostUsd: String(info.totalCost),
    metadata: {
      generationId: args.generationId,
      model: info.model,
      promptTokens: info.promptTokens,
      completionTokens: info.completionTokens,
    },
  });
  return info.totalCost;
}
