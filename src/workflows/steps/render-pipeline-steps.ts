import { FatalError } from "workflow";
import { sourceImagesForScript, type SourceImagesResult } from "@/engine/sourcing/assetSourcing";
import { generateVoiceoverForScript, type GenerateVoiceoverResult } from "@/engine/voice/voiceover";

function rethrowNonRetryableAsFatal(error: unknown): never {
  if (error instanceof Error && (error.message.includes("not found") || error.message.includes("No voiceId configured"))) {
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
