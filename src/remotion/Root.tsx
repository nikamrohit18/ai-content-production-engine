import { Composition } from "remotion";
import {
  DocumentaryVideo,
  documentaryVideoSchema,
  calculateDocumentaryVideoMetadata,
} from "./compositions/DocumentaryVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DocumentaryVideo"
      component={DocumentaryVideo}
      schema={documentaryVideoSchema}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateDocumentaryVideoMetadata}
      defaultProps={{
        beats: [],
        audioUrl: "",
        totalDurationInFrames: 300,
        width: 1080,
        height: 1920,
        fps: 30,
      }}
    />
  );
};
