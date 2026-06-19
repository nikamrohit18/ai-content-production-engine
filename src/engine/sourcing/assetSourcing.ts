import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { searchCommonsImages } from "./wikimediaCommons";

const USER_AGENT = "ai-content-production-engine/1.0 (https://ai-content-engine.rohitnikam.tech)";
const DELAY_BETWEEN_BEATS_MS = 1_000;

export type SourceImagesResult = {
  beatsProcessed: number;
  assetsCreated: number;
  beatsWithoutMatch: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sources one archival image per script beat from Wikimedia Commons.
 * A beat without a usable candidate (no search hit, fetch failure) is
 * skipped rather than aborting the whole script — partial asset coverage
 * is recoverable later, a thrown error mid-loop would discard images
 * already uploaded for earlier beats.
 */
export async function sourceImagesForScript(scriptId: string): Promise<SourceImagesResult> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!topic) throw new Error(`Topic ${script.topicId} not found`);

  // Blob uploads are idempotent (allowOverwrite, deterministic path per beat) —
  // DB rows need the same property for retries (workflow step retries, or a
  // manual re-source) to land a clean set rather than duplicating every beat
  // sourced before whatever caused the retry.
  await db
    .delete(schema.assets)
    .where(and(eq(schema.assets.scriptId, scriptId), eq(schema.assets.assetType, "image_archival")));

  let assetsCreated = 0;
  let beatsWithoutMatch = 0;

  for (const [index, beat] of script.beatStructure.entries()) {
    if (index > 0) await sleep(DELAY_BETWEEN_BEATS_MS);

    // imageSearchQuery is absent on scripts generated before this field existed —
    // fall back to a cruder heuristic so old scripts still get partial coverage.
    const query = beat.imageSearchQuery ?? `${topic.titleWorking} ${beat.visualCue}`.slice(0, 300);

    let candidates = await searchCommonsImages(query, 3).catch(() => []);

    // Commons' search matches near-literally on title words rather than
    // ranking semantically — a query with more than ~3 words frequently
    // returns nothing even when the core entity name alone would hit.
    // Retrying with just the leading words recovers most of those misses.
    const words = query.split(/\s+/);
    if (candidates.length === 0 && words.length > 3) {
      await sleep(DELAY_BETWEEN_BEATS_MS);
      const shortQuery = words.slice(0, 3).join(" ");
      candidates = await searchCommonsImages(shortQuery, 3).catch(() => []);
    }

    const candidate = candidates[0];
    if (!candidate) {
      beatsWithoutMatch += 1;
      continue;
    }

    const imageRes = await fetch(candidate.fileUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!imageRes?.ok) {
      beatsWithoutMatch += 1;
      continue;
    }

    const imageBytes = await imageRes.arrayBuffer();
    const extension = candidate.mimeType.split("/")[1] ?? "jpg";

    const blob = await put(`assets/${topic.id}/${scriptId}/beat-${index}.${extension}`, Buffer.from(imageBytes), {
      access: "private",
      contentType: candidate.mimeType,
      // The path is deterministic per beat by design — a retry or manual
      // re-source for the same beat should replace it, not error or pile
      // up randomly-suffixed orphans.
      allowOverwrite: true,
    });

    await db.insert(schema.assets).values({
      topicId: topic.id,
      scriptId,
      assetType: "image_archival",
      source: "wikimedia",
      sourceUrl: candidate.pageUrl,
      license: candidate.license,
      blobUrl: blob.url,
      blobAccess: "private",
      metadata: {
        beatIndex: index,
        beatName: beat.beatName,
        searchQuery: query,
        width: candidate.width,
        height: candidate.height,
      },
    });
    assetsCreated += 1;
  }

  return { beatsProcessed: script.beatStructure.length, assetsCreated, beatsWithoutMatch };
}
