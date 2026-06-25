import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { cleanNarrationText } from "@/engine/ai/script";
import type { DocumentaryVideoProps } from "@/remotion/compositions/DocumentaryVideo";

export const REMOTION_COMPOSITION_ID = "DocumentaryVideo";
const FPS = 30;
export const DIMENSIONS = { short: { width: 1080, height: 1920 }, longform: { width: 1920, height: 1080 } } as const;

export type CompositionPlan = {
  remotionCompositionId: string;
  fps: number;
  width: number;
  height: number;
  durationSec: number;
  props: DocumentaryVideoProps;
};

/**
 * Resolves the final image URL per beat, carrying forward the nearest prior
 * sourced image for beats Wikimedia/Internet Archive had no match for (a
 * real, expected gap — see assetSourcing.ts) so the video never has a beat
 * with no image at all. Falls back to the nearest *later* image for any
 * gap at the very start, before any image has been sourced yet.
 */
function resolveImageUrls(beatCount: number, imagesByBeatIndex: Map<number, string>): string[] {
  const resolved: (string | undefined)[] = Array.from({ length: beatCount }, (_, i) => imagesByBeatIndex.get(i));

  let lastSeen: string | undefined;
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i]) lastSeen = resolved[i];
    else resolved[i] = lastSeen;
  }

  let nextSeen: string | undefined;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i]) nextSeen = resolved[i];
    else resolved[i] = nextSeen;
  }

  if (resolved.some((url) => !url)) {
    throw new Error("No images were sourced for any beat in this script — cannot build a composition");
  }
  return resolved as string[];
}

/**
 * Builds the exact input props the DocumentaryVideo Remotion composition
 * needs, plus the metadata (duration, dimensions) a videos row should
 * record. Pure derivation from DB state — callable both to validate +
 * create the videos row now, and later by the render-dispatch step to feed
 * the actual renderMedia() call.
 */
export async function buildCompositionProps(scriptId: string): Promise<CompositionPlan> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!topic) throw new Error(`Topic ${script.topicId} not found`);

  const assets = await db.query.assets.findMany({ where: (a, { eq }) => eq(a.scriptId, scriptId) });

  const voiceoverAsset = assets.find((a) => a.assetType === "audio_voiceover");
  if (!voiceoverAsset?.blobUrl) throw new Error(`No voiceover asset found for script ${scriptId}`);

  const voiceMeta = voiceoverAsset.metadata as {
    durationSec?: number;
    beatTimings?: Array<{ beatIndex: number; startSec: number; endSec: number }>;
  };
  if (!voiceMeta.durationSec || !voiceMeta.beatTimings) {
    throw new Error(`Voiceover asset for script ${scriptId} is missing durationSec/beatTimings metadata`);
  }

  const imagesByBeatIndex = new Map<number, string>();
  for (const asset of assets) {
    if (asset.assetType !== "image_archival" || !asset.blobUrl) continue;
    const beatIndex = (asset.metadata as { beatIndex?: number }).beatIndex;
    if (typeof beatIndex === "number") imagesByBeatIndex.set(beatIndex, asset.blobUrl);
  }
  const imageUrls = resolveImageUrls(script.beatStructure.length, imagesByBeatIndex);

  const { width, height } = DIMENSIONS[topic.format];
  const totalDurationInFrames = Math.ceil(voiceMeta.durationSec * FPS);

  const timingByBeatIndex = new Map(voiceMeta.beatTimings.map((t) => [t.beatIndex, t]));
  const startFrames = script.beatStructure.map((_, index) => {
    const timing = timingByBeatIndex.get(index);
    if (!timing) throw new Error(`Missing beat timing for beat index ${index} on script ${scriptId}`);
    return Math.round(timing.startSec * FPS);
  });

  const beats = script.beatStructure.map((beat, index) => {
    const nextStartFrame = index < startFrames.length - 1 ? startFrames[index + 1] : totalDurationInFrames;
    return {
      imageUrl: imageUrls[index],
      captionText: cleanNarrationText(beat.narrationText),
      startFrame: startFrames[index],
      durationInFrames: nextStartFrame - startFrames[index],
    };
  });

  return {
    remotionCompositionId: REMOTION_COMPOSITION_ID,
    fps: FPS,
    width,
    height,
    durationSec: voiceMeta.durationSec,
    props: { beats, audioUrl: voiceoverAsset.blobUrl, totalDurationInFrames, width, height, fps: FPS },
  };
}

export async function prepareVideoRecord(scriptId: string): Promise<{ videoId: string; durationSec: number }> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!topic) throw new Error(`Topic ${script.topicId} not found`);

  const plan = await buildCompositionProps(scriptId);

  // Idempotent like the asset-sourcing/voiceover steps: a retry or manual
  // re-prepare should replace the existing videos row for this topic, not
  // conflict with the table's uniqueIndex on topicId.
  await db.delete(schema.videos).where(eq(schema.videos.topicId, topic.id));

  const [video] = await db
    .insert(schema.videos)
    .values({
      topicId: topic.id,
      format: topic.format,
      remotionCompositionId: plan.remotionCompositionId,
      durationSec: Math.round(plan.durationSec),
      status: "render_queued",
    })
    .returning();

  return { videoId: video.id, durationSec: plan.durationSec };
}
