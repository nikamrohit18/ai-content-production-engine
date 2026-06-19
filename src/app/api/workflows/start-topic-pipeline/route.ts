import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runTopicPipeline } from "@/workflows/topic-pipeline";

export async function POST(request: Request) {
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
