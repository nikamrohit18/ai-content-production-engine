import Link from "next/link";
import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunPipelineButton } from "./backlog-actions";

function formatDuration(totalSec: number): string {
  const sec = Math.round(totalSec);
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  backlog: "outline",
  researching: "secondary",
  scripting: "secondary",
  factchecking: "secondary",
  awaiting_review: "default",
  approved: "secondary",
  rejected: "destructive",
  failed: "destructive",
  in_production: "secondary",
  published: "secondary",
  archived: "outline",
};

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
  const topics = await db.query.topics.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 200,
  });

  const counts = topics.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
        <p className="text-muted-foreground text-sm">
          Every topic in the pipeline, newest first. Topics still in &ldquo;backlog&rdquo; haven&rsquo;t been picked
          up yet — run the pipeline manually below, or wait for the daily refill cron.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, count]) => (
          <Badge key={status} variant={STATUS_VARIANT[status] ?? "outline"}>
            {status.replace(/_/g, " ")}: {count}
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="max-w-md truncate font-medium">{topic.titleWorking}</TableCell>
                  <TableCell className="capitalize">{topic.format}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[topic.status] ?? "outline"}>
                      {topic.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lengthLabel(topic)}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {topic.source.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(topic.status === "backlog" || topic.status === "failed") && (
                      <RunPipelineButton topicId={topic.id} topicTitle={topic.titleWorking} />
                    )}
                    {HAS_SCRIPT_STATUSES.has(topic.status) && (
                      <Link href={`/production/${topic.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        View package
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {topics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                    No topics yet. Seed the backlog or wait for trend sourcing to add some.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
