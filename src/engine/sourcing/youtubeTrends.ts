import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getTrendSearchQueries } from "@/config/niches";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export type TrendVideoCandidate = {
  videoId: string;
  title: string;
  channelTitle: string | null;
  publishedAt: string | null;
};

function requireApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");
  return apiKey;
}

export async function searchTrendingVideos(query: string): Promise<TrendVideoCandidate[]> {
  const apiKey = requireApiKey();
  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    part: "snippet",
    type: "video",
    order: "viewCount",
    regionCode: "US",
    relevanceLanguage: "en",
    publishedAfter,
    maxResults: "10",
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube search.list failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return (data.items ?? []).map((item: { id: { videoId: string }; snippet: { title: string; channelTitle?: string; publishedAt?: string } }) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle ?? null,
    publishedAt: item.snippet.publishedAt ?? null,
  }));
}

export async function fetchVideoStats(videoIds: string[]): Promise<Map<string, number>> {
  const stats = new Map<string, number>();
  if (videoIds.length === 0) return stats;

  const apiKey = requireApiKey();
  const params = new URLSearchParams({
    key: apiKey,
    id: videoIds.slice(0, 50).join(","),
    part: "statistics",
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube videos.list failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  for (const item of data.items ?? []) {
    stats.set(item.id, Number(item.statistics?.viewCount ?? 0));
  }
  return stats;
}

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DiscoverResult = { signalsFound: number; quotaUnitsUsed: number };

export async function discoverTrendSignals(channelId: string): Promise<DiscoverResult> {
  const db = getDb();

  const channel = await db.query.channels.findFirst({ where: (c, { eq: eqOp }) => eqOp(c.id, channelId) });
  if (!channel) throw new Error(`Channel ${channelId} not found`);

  const queries = getTrendSearchQueries(channel.niche);
  let signalsFound = 0;
  let quotaUnitsUsed = 0;

  for (const query of queries) {
    const candidates = await searchTrendingVideos(query);
    quotaUnitsUsed += 1;
    if (candidates.length === 0) continue;

    const stats = await fetchVideoStats(candidates.map((c) => c.videoId));
    quotaUnitsUsed += 1;

    for (const candidate of candidates) {
      const viewCount = stats.get(candidate.videoId) ?? null;
      await db
        .insert(schema.trendSignals)
        .values({
          channelId,
          query,
          videoId: candidate.videoId,
          videoTitle: candidate.title,
          videoChannelTitle: candidate.channelTitle,
          viewCount,
          publishedAt: candidate.publishedAt ? new Date(candidate.publishedAt) : null,
          rawMetadata: { candidate, viewCount },
        })
        .onConflictDoUpdate({
          target: [schema.trendSignals.channelId, schema.trendSignals.videoId],
          set: {
            viewCount,
            publishedAt: candidate.publishedAt ? new Date(candidate.publishedAt) : null,
            rawMetadata: { candidate, viewCount },
            updatedAt: new Date(),
          },
        });
      signalsFound += 1;
    }
  }

  if (quotaUnitsUsed > 0) {
    await db.insert(schema.costLedger).values({
      channelId,
      provider: "youtube_quota",
      category: "api_quota_units",
      quantity: String(quotaUnitsUsed),
      totalCostUsd: "0",
      metadata: { queries },
    });
  }

  return { signalsFound, quotaUnitsUsed };
}

export type PromoteResult = { promoted: number };

export async function promoteTrendSignalsToTopics(
  channelId: string,
  opts?: { limit?: number },
): Promise<PromoteResult> {
  const db = getDb();
  const limit = opts?.limit ?? 3;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const claimed = await db
    .update(schema.trendSignals)
    .set({ claimedAt: new Date() })
    .where(
      inArray(
        schema.trendSignals.id,
        db
          .select({ id: schema.trendSignals.id })
          .from(schema.trendSignals)
          .where(
            and(
              eq(schema.trendSignals.channelId, channelId),
              isNull(schema.trendSignals.promotedTopicId),
              or(isNull(schema.trendSignals.claimedAt), lt(schema.trendSignals.claimedAt, fiveMinAgo)),
            ),
          )
          .orderBy(desc(schema.trendSignals.viewCount))
          .limit(limit),
      ),
    )
    .returning();

  if (claimed.length === 0) return { promoted: 0 };

  const channel = await db.query.channels.findFirst({ where: (c, { eq: eqOp }) => eqOp(c.id, channelId) });
  if (!channel) throw new Error(`Channel ${channelId} not found`);

  const nicheTemplate = await db.query.nicheTemplates.findFirst({
    where: (nt, { eq: eqOp }) => eqOp(nt.niche, channel.niche),
  });
  if (!nicheTemplate) throw new Error(`Niche template not found for niche ${channel.niche}`);

  const existingTopics = await db.query.topics.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.channelId, channelId),
  });
  const existingNormalized = new Set(existingTopics.map((t) => normalizeTitle(t.titleWorking)));

  let promoted = 0;
  for (const signal of claimed) {
    const normalized = normalizeTitle(signal.videoTitle);
    if (existingNormalized.has(normalized)) continue;

    const [topic] = await db
      .insert(schema.topics)
      .values({
        channelId,
        nicheTemplateId: nicheTemplate.id,
        titleWorking: signal.videoTitle.slice(0, 256),
        format: "short",
        status: "backlog",
        source: "trend_signal",
        notes: `Trend-sourced from YouTube video (https://youtube.com/watch?v=${signal.videoId}, ${signal.viewCount ?? "unknown"} views)`,
      })
      .returning();

    await db
      .update(schema.trendSignals)
      .set({ promotedTopicId: topic.id, updatedAt: new Date() })
      .where(eq(schema.trendSignals.id, signal.id));

    existingNormalized.add(normalized);
    promoted += 1;
  }

  return { promoted };
}
