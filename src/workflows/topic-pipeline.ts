import {
  generateResearchStep,
  saveResearchStep,
  generateScriptStep,
  saveScriptStep,
  generateFactCheckStep,
  saveFactCheckStep,
  setTopicStatusStep,
} from "./steps/topic-pipeline-steps";

export async function runTopicPipeline(topicId: string, channelId: string) {
  "use workflow";

  await setTopicStatusStep(topicId, "researching");
  const researchDraft = await generateResearchStep(topicId);
  const { briefId } = await saveResearchStep(topicId, channelId, researchDraft);

  await setTopicStatusStep(topicId, "scripting");
  const scriptDraft = await generateScriptStep(topicId, briefId);
  const { scriptId } = await saveScriptStep(topicId, channelId, scriptDraft);

  await setTopicStatusStep(topicId, "factchecking");
  const factCheckDraft = await generateFactCheckStep(scriptId);
  await saveFactCheckStep(scriptId, channelId, topicId, factCheckDraft);

  await setTopicStatusStep(topicId, "awaiting_review");

  return { topicId, scriptId, briefId, status: "awaiting_review" as const };
}
