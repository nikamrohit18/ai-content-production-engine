import { discoverTrendSignalsStep, promoteTrendSignalsStep } from "./steps/backlog-refill-steps";

type ChannelRefillResult =
  | { channelId: string; signalsFound: number; quotaUnitsUsed: number; promoted: number }
  | { channelId: string; error: string };

export async function runBacklogRefill(channelIds: string[]) {
  "use workflow";

  const results: ChannelRefillResult[] = [];

  for (const channelId of channelIds) {
    try {
      const discover = await discoverTrendSignalsStep(channelId);
      const promote = await promoteTrendSignalsStep(channelId);
      results.push({ channelId, ...discover, ...promote });
    } catch (error) {
      results.push({ channelId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { results };
}
