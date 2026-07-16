import { GatewayResponseError } from "@ai-sdk/gateway";
import { gateway } from "ai";
import { getDb, schema } from "@/db";

type CostProvider = (typeof schema.costProviderEnum.enumValues)[number];

function mapModelToProvider(modelUsed: string): CostProvider {
  if (modelUsed.startsWith("anthropic/")) return "anthropic";
  if (modelUsed.startsWith("openai/")) return "openai_text";
  return "other";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The Gateway's usage event for a generation isn't indexed the instant
// generateText() resolves — calling getGenerationInfo right away reliably 404s
// with "Usage event not found" even though the generation succeeded, which was
// silently zeroing out every cost-ledger row. The SDK marks this error
// isRetryable: false because an *immediate* retry wouldn't help either — only
// waiting for indexing to catch up does, hence the backoff here instead of a
// second immediate attempt.
const GENERATION_INFO_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];

async function fetchGenerationInfoWithRetry(generationId: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gateway.getGenerationInfo({ id: generationId });
    } catch (error) {
      const usageEventNotYetIndexed = GatewayResponseError.isInstance(error) && error.statusCode === 404;
      if (!usageEventNotYetIndexed || attempt >= GENERATION_INFO_RETRY_DELAYS_MS.length) throw error;
      await sleep(GENERATION_INFO_RETRY_DELAYS_MS[attempt]);
    }
  }
}

export async function recordGenerationCost(args: {
  channelId: string;
  topicId: string;
  generationId: string;
  modelUsed: string;
  category: "llm_tokens";
}): Promise<number> {
  let info;
  try {
    info = await fetchGenerationInfoWithRetry(args.generationId);
  } catch (error) {
    // A Gateway cost-lookup hiccup shouldn't take down the pipeline step that
    // depends on it — the generated content is more valuable than the cost row.
    console.error(`recordGenerationCost: getGenerationInfo failed for ${args.generationId}`, error);
    return 0;
  }
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
