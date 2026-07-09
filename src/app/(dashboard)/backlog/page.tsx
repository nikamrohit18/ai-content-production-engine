import Link from "next/link";
import { getDb } from "@/db";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunPipelineButton } from "./backlog-actions";

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
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
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
