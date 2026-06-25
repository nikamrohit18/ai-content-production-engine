import { getDb } from "@/db";
import { DIMENSIONS } from "@/engine/render/composition";
import { buildSourcesExport, type SourcesExport } from "./sources";

export type ProductionPackageBeat = {
  beatIndex: number;
  beatName: string;
  narrationText: string;
  imageGenPrompt: string | null;
  videoGenPrompt: string | null;
  referenceImageAssetId: string | null;
  referenceImageLicense: string | null;
  /** When this beat's narration starts in the single continuous voiceover track. */
  startSec: number | null;
  /**
   * When to cut to the NEXT beat's visual — runs until the next beat's
   * startSec (or the end of the track for the last beat), not this beat's
   * own narration end, so there's no on-screen gap during the natural
   * pause between lines. Matches the Remotion composition's timing exactly.
   */
  onScreenUntilSec: number | null;
};

export type ProductionPackageSeo = {
  tags: string[] | null;
  hashtags: string[] | null;
  description: string | null;
  /** description + hashtags + sources assembled in upload order — ready to paste as-is. */
  fullDescription: string;
};

export type ProductionPackage = {
  topicId: string;
  scriptId: string;
  titleWorking: string;
  format: "short" | "longform";
  dimensions: { width: number; height: number };
  fullNarrationText: string;
  thumbnailPrompts: Array<{ concept: string; textOverlay: string }> | null;
  voiceover: { assetId: string; characterCount: number; durationSec: number } | null;
  beats: ProductionPackageBeat[];
  seo: ProductionPackageSeo;
  sources: SourcesExport;
};

/**
 * Ties together everything needed for manual production: script + per-beat
 * visual prompts (with the already-sourced archival image as a recreate/
 * enhance reference) + thumbnail prompts + voiceover + sources. Doesn't
 * require the render-pipeline steps to have produced a finished video —
 * only that sourcing + voiceover have run, since this is the engine's
 * actual terminal output now (see production-model-pivot memory).
 */
export async function buildProductionPackage(scriptId: string): Promise<ProductionPackage> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!topic) throw new Error(`Topic ${script.topicId} not found`);

  const assets = await db.query.assets.findMany({ where: (a, { eq }) => eq(a.scriptId, scriptId) });

  const imageByBeatIndex = new Map<number, { id: string; license: string }>();
  for (const asset of assets) {
    if (asset.assetType !== "image_archival") continue;
    const beatIndex = (asset.metadata as { beatIndex?: number }).beatIndex;
    if (typeof beatIndex === "number") imageByBeatIndex.set(beatIndex, { id: asset.id, license: asset.license });
  }

  const voiceoverAsset = assets.find((a) => a.assetType === "audio_voiceover");
  const voiceMeta = voiceoverAsset?.metadata as
    | { characterCount?: number; durationSec?: number; beatTimings?: Array<{ beatIndex: number; startSec: number; endSec: number }> }
    | undefined;
  const voiceover =
    voiceoverAsset && voiceMeta?.durationSec
      ? { assetId: voiceoverAsset.id, characterCount: voiceMeta.characterCount ?? 0, durationSec: voiceMeta.durationSec }
      : null;
  const timings = [...(voiceMeta?.beatTimings ?? [])].sort((a, b) => a.beatIndex - b.beatIndex);
  const timingByBeatIndex = new Map(timings.map((t) => [t.beatIndex, t]));

  const beats: ProductionPackageBeat[] = script.beatStructure.map((beat, beatIndex) => {
    const reference = imageByBeatIndex.get(beatIndex);
    const timing = timingByBeatIndex.get(beatIndex);
    const nextTiming = timings[timings.findIndex((t) => t.beatIndex === beatIndex) + 1];
    return {
      beatIndex,
      beatName: beat.beatName,
      narrationText: beat.narrationText,
      imageGenPrompt: beat.imageGenPrompt ?? null,
      videoGenPrompt: beat.videoGenPrompt ?? null,
      referenceImageAssetId: reference?.id ?? null,
      referenceImageLicense: reference?.license ?? null,
      startSec: timing?.startSec ?? null,
      onScreenUntilSec: timing ? nextTiming?.startSec ?? voiceMeta?.durationSec ?? timing.endSec : null,
    };
  });

  const sources = await buildSourcesExport(topic.id, scriptId);

  const fullDescription = [script.seoDescription, script.hashtags?.join(" "), sources.text]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");

  return {
    topicId: topic.id,
    scriptId,
    titleWorking: topic.titleWorking,
    format: topic.format,
    dimensions: DIMENSIONS[topic.format],
    fullNarrationText: script.fullNarrationText,
    thumbnailPrompts: script.thumbnailPrompts ?? null,
    voiceover,
    beats,
    seo: {
      tags: script.seoTags ?? null,
      hashtags: script.hashtags ?? null,
      description: script.seoDescription ?? null,
      fullDescription,
    },
    sources,
  };
}
