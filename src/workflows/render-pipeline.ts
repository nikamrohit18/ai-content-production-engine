import { setTopicStatusStep } from "./steps/topic-pipeline-steps";
import { sourceAssetsStep } from "./steps/render-pipeline-steps";

/**
 * Starts once a topic is approved. Currently just sources archival images
 * per beat — Remotion composition and render dispatch land as further
 * steps in this same workflow once built, rather than a separate trigger.
 */
export async function runRenderPipeline(topicId: string, scriptId: string) {
  "use workflow";

  await setTopicStatusStep(topicId, "in_production");
  const sourcing = await sourceAssetsStep(scriptId);

  return { topicId, scriptId, ...sourcing };
}
