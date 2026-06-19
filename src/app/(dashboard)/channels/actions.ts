"use server";

import { start } from "workflow/api";
import { revalidatePath } from "next/cache";
import { runBacklogRefill } from "@/workflows/backlog-refill";

export async function refillBacklog(channelId: string): Promise<void> {
  await start(runBacklogRefill, [[channelId]]);
  revalidatePath("/channels");
  revalidatePath("/backlog");
}
