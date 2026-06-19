"use server";

import { start } from "workflow/api";
import { revalidatePath } from "next/cache";
import { runBacklogRefill } from "@/workflows/backlog-refill";
import { requireAuth } from "@/lib/require-auth";

export async function refillBacklog(channelId: string): Promise<void> {
  await requireAuth();
  await start(runBacklogRefill, [[channelId]]);
  revalidatePath("/channels");
  revalidatePath("/backlog");
}
