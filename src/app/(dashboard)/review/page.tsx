import { getDb } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ReviewActions } from "./review-actions";

const VERDICT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  supported: "secondary",
  unsupported: "destructive",
  disputed: "destructive",
  needs_human_judgment: "outline",
};

async function getReviewQueue() {
  const db = getDb();
  const topics = await db.query.topics.findMany({
    where: (t, { eq }) => eq(t.status, "awaiting_review"),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  return Promise.all(
    topics.map(async (topic) => {
      const [channel, brief, script] = await Promise.all([
        db.query.channels.findFirst({ where: (c, { eq }) => eq(c.id, topic.channelId) }),
        db.query.researchBriefs.findFirst({
          where: (rb, { eq }) => eq(rb.topicId, topic.id),
          orderBy: (rb, { desc }) => [desc(rb.createdAt)],
        }),
        db.query.scripts.findFirst({
          where: (s, { eq }) => eq(s.topicId, topic.id),
          orderBy: (s, { desc }) => [desc(s.version)],
        }),
      ]);

      const factChecks = script
        ? await db.query.factChecks.findMany({
            where: (fc, { eq }) => eq(fc.scriptId, script.id),
          })
        : [];

      return { topic, channel, brief, script, factChecks };
    }),
  );
}

export default async function ReviewPage() {
  const queue = await getReviewQueue();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
        <p className="text-muted-foreground text-sm">
          Topics whose research, script, and fact-check stages finished and are waiting on a human decision.
        </p>
      </div>

      {queue.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Nothing is awaiting review right now. Trigger a topic from the Backlog page to fill this queue.
          </CardContent>
        </Card>
      )}

      {queue.map(({ topic, channel, brief, script, factChecks }) => {
        const flaggedCount = factChecks.filter(
          (fc) => fc.verdict === "disputed" || fc.verdict === "unsupported",
        ).length;

        return (
          <Card key={topic.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">{topic.titleWorking}</CardTitle>
                <CardDescription>
                  {channel?.displayName ?? "Unknown channel"} · {topic.format} · source: {topic.source}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {flaggedCount > 0 && (
                  <Badge variant="destructive">
                    {flaggedCount} flagged claim{flaggedCount === 1 ? "" : "s"}
                  </Badge>
                )}
                {script && <Badge variant="outline">v{script.version}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="script">
                <TabsList>
                  <TabsTrigger value="script">Script</TabsTrigger>
                  <TabsTrigger value="brief">Research brief</TabsTrigger>
                  <TabsTrigger value="factcheck">Fact-check ({factChecks.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="script" className="space-y-4">
                  {script ? (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{script.fullNarrationText}</p>
                      <Separator />
                      <div className="space-y-2">
                        {script.beatStructure.map((beat, i) => (
                          <div key={i} className="border-border rounded-md border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{beat.beatName}</span>
                              <span className="text-muted-foreground text-xs">{beat.estDurationSec}s</span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">Visual: {beat.visualCue}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {script.wordCount} words · model: {script.modelUsed} · cost: $
                        {Number(script.generationCostUsd ?? 0).toFixed(4)}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No script found.</p>
                  )}
                </TabsContent>
                <TabsContent value="brief" className="space-y-3">
                  {brief ? (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{brief.content}</p>
                      {brief.disputedClaims.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Disputed claims flagged during research</p>
                          <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                            {brief.disputedClaims.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Sources</p>
                        <ul className="text-muted-foreground mt-1 space-y-1 text-sm">
                          {brief.sources.map((s, i) => (
                            <li key={i}>
                              <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                {s.sourceName}
                              </a>
                              {" — "}
                              {s.excerpt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No research brief found.</p>
                  )}
                </TabsContent>
                <TabsContent value="factcheck" className="space-y-3">
                  {factChecks.length === 0 && (
                    <p className="text-muted-foreground text-sm">No fact-check claims recorded.</p>
                  )}
                  {factChecks.map((fc) => (
                    <div key={fc.id} className="border-border rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">{fc.claimText}</p>
                        <Badge variant={VERDICT_VARIANT[fc.verdict] ?? "outline"}>
                          {fc.verdict.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {(fc.citations ?? []).length > 0 && (
                        <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                          {(fc.citations ?? []).map((c, i) => (
                            <li key={i}>
                              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                {c.sourceName}
                              </a>
                              {" — "}
                              {c.excerpt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="justify-end">
              {script && <ReviewActions topicId={topic.id} scriptId={script.id} topicTitle={topic.titleWorking} />}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
