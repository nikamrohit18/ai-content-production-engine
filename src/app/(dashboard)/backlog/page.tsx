import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { deriveShots } from "@/engine/ai/script";
import { BacklogTable, type BacklogRow } from "./backlog-table";
import { NewTopicDialog } from "./new-topic-dialog";

function formatDuration(totalSec: number): string {
  const sec = Math.round(totalSec);
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// A script (and usually sourced assets/voiceover) exists for any topic past
// these earlier in-flight statuses — that's when a production package is
// actually viewable, not just a status label.
const HAS_SCRIPT_STATUSES = new Set([
  "awaiting_review",
  "approved",
  "in_production",
  "published",
  "rejected",
  "archived",
]);

export default async function BacklogPage() {
  const db = getDb();
  const [topics, channels] = await Promise.all([
    db.query.topics.findMany({
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
      limit: 200,
    }),
    db.query.channels.findMany({
      where: (c, { eq }) => eq(c.isActive, true),
      orderBy: (c, { asc }) => [asc(c.displayName)],
    }),
  ]);

  const topicIds = topics.map((t) => t.id);
  const [videoRows, scriptRows, nicheTemplateRows] = topicIds.length
    ? await Promise.all([
        db
          .select({ topicId: schema.videos.topicId, durationSec: schema.videos.durationSec })
          .from(schema.videos)
          .where(inArray(schema.videos.topicId, topicIds)),
        db
          .select({
            topicId: schema.scripts.topicId,
            version: schema.scripts.version,
            beatStructure: schema.scripts.beatStructure,
          })
          .from(schema.scripts)
          .where(inArray(schema.scripts.topicId, topicIds)),
        db
          .select({
            id: schema.nicheTemplates.id,
            defaultShortLengthSec: schema.nicheTemplates.defaultShortLengthSec,
            defaultLongformLengthSec: schema.nicheTemplates.defaultLongformLengthSec,
          })
          .from(schema.nicheTemplates),
      ])
    : [[], [], []];

  const renderedDurationByTopic = new Map(
    videoRows.filter((v) => v.durationSec != null).map((v) => [v.topicId, v.durationSec as number]),
  );

  const latestScriptByTopic = new Map<string, (typeof scriptRows)[number]>();
  for (const script of scriptRows) {
    const existing = latestScriptByTopic.get(script.topicId);
    if (!existing || script.version > existing.version) {
      latestScriptByTopic.set(script.topicId, script);
    }
  }

  const nicheTemplateById = new Map(nicheTemplateRows.map((nt) => [nt.id, nt]));

  function lengthLabel(topic: (typeof topics)[number]): string {
    const renderedDuration = renderedDurationByTopic.get(topic.id);
    if (renderedDuration != null) return formatDuration(renderedDuration);

    const script = latestScriptByTopic.get(topic.id);
    if (script) {
      const estSec = script.beatStructure.reduce((sum, beat) => sum + (beat.estDurationSec ?? 0), 0);
      if (estSec > 0) return `~${formatDuration(estSec)}`;
    }

    const template = nicheTemplateById.get(topic.nicheTemplateId);
    const targetSec =
      template && (topic.format === "short" ? template.defaultShortLengthSec : template.defaultLongformLengthSec);
    return targetSec ? `${formatDuration(targetSec)} target` : "—";
  }

  const rows: BacklogRow[] = topics.map((topic) => {
    const script = latestScriptByTopic.get(topic.id);
    return {
      id: topic.id,
      titleWorking: topic.titleWorking,
      format: topic.format,
      status: topic.status,
      sceneCount: script ? deriveShots(script.beatStructure).length : null,
      lengthLabel: lengthLabel(topic),
      source: topic.source,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      youtubeUrl: topic.youtubeUrl,
      canRunPipeline: topic.status === "backlog" || topic.status === "failed",
      hasScript: HAS_SCRIPT_STATUSES.has(topic.status),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
          <p className="text-muted-foreground text-sm">
            Every topic in the pipeline, most recently updated first. Topics still in &ldquo;backlog&rdquo; haven&rsquo;t
            been picked up yet — run the pipeline manually below, or wait for the daily refill cron.
          </p>
        </div>
        <NewTopicDialog channels={channels.map((c) => ({ id: c.id, displayName: c.displayName }))} />
      </div>

      <BacklogTable rows={rows} />
    </div>
  );
}
