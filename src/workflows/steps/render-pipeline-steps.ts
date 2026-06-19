import { FatalError } from "workflow";
import { sourceImagesForScript, type SourceImagesResult } from "@/engine/sourcing/assetSourcing";

export async function sourceAssetsStep(scriptId: string): Promise<SourceImagesResult> {
  "use step";
  try {
    return await sourceImagesForScript(scriptId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new FatalError(error.message);
    }
    throw error;
  }
}
sourceAssetsStep.maxRetries = 2;
