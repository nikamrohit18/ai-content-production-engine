"use server";

import { start } from "workflow/api";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { runTopicPipeline } from "@/workflows/topic-pipeline";
import { requireAuth } from "@/lib/require-auth";

export async function triggerPipeline(topicId: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "backlog") throw new Error(`Topic is already in status '${topic.status}'`);

  await start(runTopicPipeline, [topicId, topic.channelId]);
  revalidatePath("/backlog");
}
