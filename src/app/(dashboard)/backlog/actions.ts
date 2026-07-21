"use server";

import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/require-auth";

export async function triggerPipeline(topicId: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "backlog" && topic.status !== "failed") {
    throw new Error(`Topic is already in status '${topic.status}'`);
  }

  // Lazy import: keeps the workflow module graph (AI SDK, workflow core, all step files) out of
  // /backlog's own compile. A top-level import here forced Turbopack to re-bundle the entire
  // workflow graph as part of rendering the plain topics list, which was blocking the event loop
  // long enough (10-20s+) to break the page's own DB queries.
  const { runTopicPipeline } = await import("@/workflows/topic-pipeline");
  await start(runTopicPipeline, [topicId, topic.channelId]);
  revalidatePath("/backlog");
}

export async function markPublished(topicId: string, youtubeUrl?: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "in_production") {
    throw new Error(`Topic is in status '${topic.status}', expected 'in_production'`);
  }

  await db
    .update(schema.topics)
    .set({ status: "published", publishedAt: new Date(), youtubeUrl: youtubeUrl || null })
    .where(eq(schema.topics.id, topicId));

  revalidatePath("/backlog");
  revalidatePath(`/production/${topicId}`);
}
