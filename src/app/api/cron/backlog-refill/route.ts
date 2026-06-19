import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runBacklogRefill } from "@/workflows/backlog-refill";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const activeChannels = await db.query.channels.findMany({ where: (c, { eq }) => eq(c.isActive, true) });

  const run = await start(runBacklogRefill, [activeChannels.map((c) => c.id)]);
  return NextResponse.json({ runId: run.runId, channelCount: activeChannels.length });
}
