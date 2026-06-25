import { setTopicStatusStep } from "./steps/topic-pipeline-steps";
import { sourceAssetsStep, generateVoiceoverStep, prepareCompositionStep } from "./steps/render-pipeline-steps";

/**
 * Starts once a topic is approved. Sources archival images per beat,
 * generates the voiceover, then prepares the Remotion composition's
 * videos row (status: render_queued) — actual render dispatch (Vercel
 * Sandbox) is the next stage to land in this same workflow.
 */
export async function runRenderPipeline(topicId: string, scriptId: string) {
  "use workflow";

  await setTopicStatusStep(topicId, "in_production");
  const sourcing = await sourceAssetsStep(scriptId);
  const voiceover = await generateVoiceoverStep(scriptId);
  const composition = await prepareCompositionStep(scriptId);

  return { topicId, scriptId, sourcing, voiceover, composition };
}
