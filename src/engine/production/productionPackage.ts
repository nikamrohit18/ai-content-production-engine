import { getDb } from "@/db";
import { deriveShots } from "@/engine/ai/script";
import { DIMENSIONS } from "@/engine/render/composition";
import { buildSourcesExport, type SourcesExport } from "./sources";

export type ProductionPackageShot = {
  beatIndex: number;
  shotIndex: number;
  beatName: string;
  /** The slice of this beat's narration this shot's visual covers — not the whole beat. */
  narrationSpan: string;
  imageGenPrompt: string | null;
  videoGenPrompt: string | null;
  referenceImageAssetId: string | null;
  referenceImageLicense: string | null;
  /** When this shot's narration starts in the single continuous voiceover track. */
  startSec: number | null;
  /**
   * When to cut to the NEXT shot's visual — runs until the next shot's
   * startSec (or the end of the track for the last shot), not this shot's
   * own narration end, so there's no on-screen gap during the natural
   * pause between lines.
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
  shots: ProductionPackageShot[];
  seo: ProductionPackageSeo;
  sources: SourcesExport;
};

/**
 * Ties together everything needed for manual production: script + per-shot
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
    | {
        characterCount?: number;
        durationSec?: number;
        shotTimings?: Array<{ beatIndex: number; shotIndex: number; startSec: number; endSec: number }>;
        /** Voiceovers generated before shot-level timing existed only have this. */
        beatTimings?: Array<{ beatIndex: number; startSec: number; endSec: number }>;
      }
    | undefined;
  const voiceover =
    voiceoverAsset && voiceMeta?.durationSec
      ? { assetId: voiceoverAsset.id, characterCount: voiceMeta.characterCount ?? 0, durationSec: voiceMeta.durationSec }
      : null;

  // Falls back to one synthetic per-beat "shot timing" (shotIndex 0) for voiceovers
  // generated before shotTimings existed — deriveShots degrades the same way for
  // scripts without visualBeats, so the two arrays stay index-aligned either way.
  const shotTimings =
    voiceMeta?.shotTimings ??
    voiceMeta?.beatTimings?.map((t) => ({ beatIndex: t.beatIndex, shotIndex: 0, startSec: t.startSec, endSec: t.endSec })) ??
    [];

  const shots: ProductionPackageShot[] = deriveShots(script.beatStructure).map((shot, i) => {
    const reference = imageByBeatIndex.get(shot.beatIndex);
    const timing = shotTimings[i];
    const nextTiming = shotTimings[i + 1];
    return {
      beatIndex: shot.beatIndex,
      shotIndex: shot.shotIndex,
      beatName: shot.beatName,
      narrationSpan: shot.narrationSpan,
      imageGenPrompt: shot.imageGenPrompt,
      videoGenPrompt: shot.videoGenPrompt,
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
    shots,
    seo: {
      tags: script.seoTags ?? null,
      hashtags: script.hashtags ?? null,
      description: script.seoDescription ?? null,
      fullDescription,
    },
    sources,
  };
}
