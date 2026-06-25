import { staticFile } from "remotion";

/**
 * In production, beat/audio URLs are real https:// Blob/CDN URLs. For local
 * verification renders, assets are downloaded to bundle()'s publicDir and
 * passed as bare filenames — staticFile() only resolves correctly when
 * called from inside the bundled browser context (it reads
 * window.remotion_staticBase), so this can't be pre-resolved by the script
 * that builds the input props; it must happen here, in the composition.
 */
export function resolveAssetSrc(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return staticFile(value);
}
