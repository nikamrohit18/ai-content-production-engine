import { z } from "zod";
import { AbsoluteFill, Audio, Sequence, type CalculateMetadataFunction } from "remotion";
import { KenBurnsImage } from "../components/KenBurnsImage";
import { Caption } from "../components/Caption";
import { resolveAssetSrc } from "../resolveAssetSrc";

export const documentaryVideoBeatSchema = z.object({
  imageUrl: z.string(),
  captionText: z.string(),
  startFrame: z.number(),
  durationInFrames: z.number(),
});

export const documentaryVideoSchema = z.object({
  beats: z.array(documentaryVideoBeatSchema),
  audioUrl: z.string(),
  totalDurationInFrames: z.number(),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
});

export type DocumentaryVideoProps = z.infer<typeof documentaryVideoSchema>;

/**
 * Duration/dimensions come from real data (actual voiceover length, short
 * vs. longform format) rather than a fixed default — calculateMetadata lets
 * the registered Composition adapt per-render instead of needing one
 * Composition per possible duration.
 */
export const calculateDocumentaryVideoMetadata: CalculateMetadataFunction<DocumentaryVideoProps> = async ({
  props,
}) => {
  return {
    durationInFrames: props.totalDurationInFrames,
    width: props.width,
    height: props.height,
    fps: props.fps,
  };
};

export const DocumentaryVideo: React.FC<DocumentaryVideoProps> = ({ beats, audioUrl }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Audio src={resolveAssetSrc(audioUrl)} />
      {beats.map((beat, index) => (
        <Sequence key={index} from={beat.startFrame} durationInFrames={beat.durationInFrames}>
          <KenBurnsImage src={beat.imageUrl} durationInFrames={beat.durationInFrames} panDirection={index % 2 === 0 ? 1 : -1} />
          <Caption text={beat.captionText} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
