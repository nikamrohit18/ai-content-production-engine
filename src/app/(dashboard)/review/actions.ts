"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/require-auth";
import { runRenderPipeline } from "@/workflows/render-pipeline";
import { checkLink, type LinkCheckResult } from "@/engine/compliance/linkCheck";

export async function checkTopicLinks(topicId: string): Promise<Record<string, LinkCheckResult>> {
  await requireAuth();
  const db = getDb();

  const brief = await db.query.researchBriefs.findFirst({
    where: (rb, { eq: eqOp }) => eqOp(rb.topicId, topicId),
    orderBy: (rb, { desc }) => [desc(rb.createdAt)],
  });
  const script = await db.query.scripts.findFirst({
    where: (s, { eq: eqOp }) => eqOp(s.topicId, topicId),
    orderBy: (s, { desc }) => [desc(s.version)],
  });
  const factChecks = script
    ? await db.query.factChecks.findMany({ where: (fc, { eq: eqOp }) => eqOp(fc.scriptId, script.id) })
    : [];

  // Re-derived from the DB by topicId rather than trusting a client-supplied
  // URL list — this action fetches arbitrary external hosts, so it shouldn't
  // accept arbitrary URLs from the caller.
  const urls = new Set<string>();
  for (const s of brief?.sources ?? []) urls.add(s.sourceUrl);
  for (const fc of factChecks) {
    for (const c of fc.citations ?? []) urls.add(c.sourceUrl);
  }

  const entries = await Promise.all([...urls].map(async (url) => [url, await checkLink(url)] as const));
  return Object.fromEntries(entries);
}

export async function approveTopic(topicId: string, scriptId: string): Promise<void> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq: eqOp }) => eqOp(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "awaiting_review") throw new Error(`Topic is not awaiting review (status: ${topic.status})`);

  await db.update(schema.topics).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.topics.id, topicId));
  await db.update(schema.scripts).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));

  await start(runRenderPipeline, [topicId, scriptId]);

  revalidatePath("/review");
  revalidatePath("/backlog");
}

export async function amendScriptText(
  scriptId: string,
  topicId: string,
  find: string,
  replace: string,
): Promise<{ occurrences: number }> {
  await requireAuth();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq: eqOp }) => eqOp(t.id, topicId) });
  if (!topic) throw new Error("Topic not found");
  if (topic.status !== "awaiting_review") {
    throw new Error(`Topic is not awaiting review (status: ${topic.status}) — amend before approving`);
  }

  const script = await db.query.scripts.findFirst({ where: (s, { eq: eqOp }) => eqOp(s.id, scriptId) });
  if (!script) throw new Error("Script not found");

  const needle = find.trim();
  if (!needle) throw new Error("Enter the text to find first");

  let occurrences = 0;
  function applyReplace(text: string): string {
    if (!text.includes(needle)) return text;
    const parts = text.split(needle);
    occurrences += parts.length - 1;
    return parts.join(replace);
  }

  // visualBeats is the actual unit of spoken narration (see script.ts) — replace
  // there so every shot's text and the derived narrationText/fullNarrationText stay
  // consistent. Scripts saved before the shot-first pivot lack visualBeats, so they
  // fall back to editing the beat's own legacy narrationText directly.
  const beatStructure = script.beatStructure.map((beat) => {
    if (beat.visualBeats?.length) {
      const visualBeats = beat.visualBeats.map((shot) => ({ ...shot, narrationSpan: applyReplace(shot.narrationSpan) }));
      return { ...beat, visualBeats, narrationText: visualBeats.map((shot) => shot.narrationSpan).join(" ") };
    }
    return { ...beat, narrationText: applyReplace(beat.narrationText) };
  });
  const fullNarrationText = beatStructure.map((beat) => beat.narrationText).join(" ");
  const seoDescription = script.seoDescription ? applyReplace(script.seoDescription) : script.seoDescription;
  const wordCount = fullNarrationText.trim().split(/\s+/).filter(Boolean).length;

  if (occurrences === 0) throw new Error(`"${needle}" wasn't found anywhere in the script`);

  await db
    .update(schema.scripts)
    .set({ beatStructure, fullNarrationText, seoDescription, wordCount, isHumanEdited: true, updatedAt: new Date() })
    .where(eq(schema.scripts.id, scriptId));

  revalidatePath("/review");
  return { occurrences };
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
