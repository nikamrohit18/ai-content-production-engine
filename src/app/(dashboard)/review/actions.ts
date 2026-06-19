"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/require-auth";

export async function approveTopic(topicId: string, scriptId: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq: eqOp }) => eqOp(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "awaiting_review") throw new Error(`Topic is not awaiting review (status: ${topic.status})`);

  await db.update(schema.topics).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.topics.id, topicId));
  await db.update(schema.scripts).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));

  revalidatePath("/review");
  revalidatePath("/backlog");
}

export async function rejectTopic(topicId: string, scriptId: string, reviewerNotes: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq: eqOp }) => eqOp(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "awaiting_review") throw new Error(`Topic is not awaiting review (status: ${topic.status})`);

  const note = reviewerNotes.trim();
  const combinedNotes = note
    ? topic.notes
      ? `${topic.notes}\n\n[Rejected] ${note}`
      : `[Rejected] ${note}`
    : topic.notes;

  await db
    .update(schema.topics)
    .set({ status: "rejected", notes: combinedNotes, updatedAt: new Date() })
    .where(eq(schema.topics.id, topicId));
  await db.update(schema.scripts).set({ status: "rejected", updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));

  revalidatePath("/review");
  revalidatePath("/backlog");
}
