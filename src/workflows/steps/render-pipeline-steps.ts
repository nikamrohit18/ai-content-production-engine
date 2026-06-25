import { FatalError } from "workflow";
import { sourceImagesForScript, type SourceImagesResult } from "@/engine/sourcing/assetSourcing";
import { generateVoiceoverForScript, type GenerateVoiceoverResult } from "@/engine/voice/voiceover";
import { prepareVideoRecord } from "@/engine/render/composition";

const NON_RETRYABLE_PATTERNS = [
  "not found",
  "No voiceId configured",
  "No images were sourced",
  "missing durationSec/beatTimings",
  "Missing beat timing",
];

function rethrowNonRetryableAsFatal(error: unknown): never {
  if (error instanceof Error && NON_RETRYABLE_PATTERNS.some((pattern) => error.message.includes(pattern))) {
    throw new FatalError(error.message);
  }
  throw error;
}

export async function sourceAssetsStep(scriptId: string): Promise<SourceImagesResult> {
  "use step";
  try {
    return await sourceImagesForScript(scriptId);
  } catch (error) {
    rethrowNonRetryableAsFatal(error);
  }
}
sourceAssetsStep.maxRetries = 2;

export async function generateVoiceoverStep(scriptId: string): Promise<GenerateVoiceoverResult> {
  "use step";
  try {
    return await generateVoiceoverForScript(scriptId);
  } catch (error) {
    rethrowNonRetryableAsFatal(error);
  }
}
generateVoiceoverStep.maxRetries = 2;

export async function prepareCompositionStep(scriptId: string): Promise<{ videoId: string; durationSec: number }> {
  "use step";
  try {
    return await prepareVideoRecord(scriptId);
  } catch (error) {
    rethrowNonRetryableAsFatal(error);
  }
}
prepareCompositionStep.maxRetries = 2;
