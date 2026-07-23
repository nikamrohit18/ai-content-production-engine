"use server";

import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/require-auth";
import { normalizeTitle } from "@/engine/sourcing/youtubeTrends";
import { borderlineContentReason } from "@/engine/sourcing/contentGuardrails";

export type CreateManualTopicInput = {
  channelId: string;
  titleWorking: string;
  format: "short" | "longform";
  /** Free text: facts, candidate hooks, candidate outlines, and/or reference URLs, all mixed together. */
  context?: string;
};

export async function createManualTopic(input: CreateManualTopicInput): Promise<{ topicId: string }> {
  await requireAuth();
  const db = getDb();

  const titleWorking = input.titleWorking.trim().slice(0, 256);
  if (!titleWorking) throw new Error("Title cannot be empty");

  const blockedReason = borderlineContentReason(titleWorking);
  if (blockedReason) throw new Error(`Title flagged by content guardrails (${blockedReason})`);

  const channel = await db.query.channels.findFirst({ where: (c, { eq: eqOp }) => eqOp(c.id, input.channelId) });
  if (!channel) throw new Error("Channel not found");

  const nicheTemplate = await db.query.nicheTemplates.findFirst({
    where: (nt, { eq: eqOp }) => eqOp(nt.niche, channel.niche),
  });
  if (!nicheTemplate) throw new Error(`No niche template configured for niche '${channel.niche}'`);

  const existingTopics = await db.query.topics.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.channelId, input.channelId),
  });
  const normalized = normalizeTitle(titleWorking);
  if (existingTopics.some((t) => normalizeTitle(t.titleWorking) === normalized)) {
    throw new Error("A topic with this title already exists in the backlog");
  }

  const rawContext = input.context?.trim() || null;

  // Insert with the raw context as a safe fallback for `notes` first — if the
  // intake distillation below fails (LLM hiccup, all URL fetches down), the
  // topic still gets created with usable (if messier) context rather than
  // losing the submission entirely.
  const [topic] = await db
    .insert(schema.topics)
    .values({
      channelId: input.channelId,
      nicheTemplateId: nicheTemplate.id,
      titleWorking,
      format: input.format,
      status: "backlog",
      source: "manual",
      notes: rawContext,
    })
    .returning();

  if (rawContext) {
    try {
      // Lazy import: keeps the AI SDK/model graph out of /backlog's own compile
      // (see the identical comment on triggerPipeline below for why that matters).
      const { analyzeManualTopicSubmission } = await import("@/engine/ai/manualIntake");
      const { recordGenerationCost } = await import("@/engine/cost/recordGeneration");
      const intake = await analyzeManualTopicSubmission(titleWorking, rawContext);

      await recordGenerationCost({
        channelId: input.channelId,
        topicId: topic.id,
        generationId: intake.generationId,
        modelUsed: intake.modelUsed,
        category: "llm_tokens",
      });

      const distilledNotes = [
        `Hook: ${intake.selectedHook}`,
        `Outline: ${intake.selectedOutline}`,
        intake.sourceUrls.length ? `Reference sources: ${intake.sourceUrls.join(", ")}` : null,
        "",
        intake.distilledBrief,
      ]
        .filter((line): line is string => line !== null)
        .join("\n");

      await db.update(schema.topics).set({ notes: distilledNotes }).where(eq(schema.topics.id, topic.id));
    } catch (error) {
      // Same reasoning as recordGenerationCost's own fallback: a distillation
      // hiccup shouldn't block getting the topic into the backlog at all — it
      // just runs research off the raw notes instead of the distilled brief.
      console.error(`createManualTopic: intake distillation failed for topic ${topic.id}`, error);
    }
  }

  revalidatePath("/backlog");
  return { topicId: topic.id };
}

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
