import { FatalError } from "workflow";
import { discoverTrendSignals, promoteTrendSignalsToTopics } from "@/engine/sourcing/youtubeTrends";

function rethrowKnownFatal(error: unknown): never {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("not found") || msg.includes("quotaExceeded") || msg.includes("dailyLimitExceeded")) {
      throw new FatalError(msg);
    }
  }
  throw error;
}

export async function discoverTrendSignalsStep(channelId: string) {
  "use step";
  try {
    return await discoverTrendSignals(channelId);
  } catch (error) {
    rethrowKnownFatal(error);
  }
}
discoverTrendSignalsStep.maxRetries = 2;

export async function promoteTrendSignalsStep(channelId: string) {
  "use step";
  try {
    return await promoteTrendSignalsToTopics(channelId);
  } catch (error) {
    rethrowKnownFatal(error);
  }
}
promoteTrendSignalsStep.maxRetries = 2;
