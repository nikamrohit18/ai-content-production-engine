import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { resolveAssetSrc } from "../resolveAssetSrc";

const MAX_ZOOM = 1.15;
const MAX_PAN_PX = 24;

/**
 * A slow zoom + pan over the sequence's duration ("Ken Burns" effect) —
 * matches the niche visual style guide's "slow Ken Burns pans over
 * archival images and maps". Direction alternates by beat index so
 * consecutive beats don't all zoom the same way.
 */
export function KenBurnsImage({
  src,
  durationInFrames,
  panDirection,
}: {
  src: string;
  durationInFrames: number;
  panDirection: 1 | -1;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, MAX_ZOOM], { extrapolateRight: "clamp" });
  const translateX = interpolate(frame, [0, durationInFrames], [0, MAX_PAN_PX * panDirection], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0a0a0a" }}>
      <Img
        src={resolveAssetSrc(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
          // Desaturated cinematic color grade per niche visual style guide.
          filter: "saturate(0.65) contrast(1.08) brightness(0.95)",
        }}
      />
    </AbsoluteFill>
  );
}
