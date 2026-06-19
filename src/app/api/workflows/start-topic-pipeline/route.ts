import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runTopicPipeline } from "@/workflows/topic-pipeline";
import { requireAuth } from "@/lib/require-auth";

export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await request.json();
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
  if (topic.status !== "backlog") {
    return NextResponse.json({ error: `Topic is already in status '${topic.status}'` }, { status: 409 });
  }

  const run = await start(runTopicPipeline, [topicId, topic.channelId]);
  return NextResponse.json({ runId: run.runId });
}
