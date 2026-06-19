import { getDb } from "@/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const db = getDb();
  const snapshots = await db.query.analyticsSnapshots.findMany({
    orderBy: (a, { desc }) => [desc(a.snapshotAt)],
    limit: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Per-video performance once published videos start reporting back from YouTube.
        </p>
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not wired up yet</CardTitle>
            <CardDescription>
              This page reads from <code>analytics_snapshots</code>, which is populated by the YouTube publish +
              analytics-poll cron once a video is actually published. The pipeline currently stops at{" "}
              <code>awaiting_review</code> — rendering, publishing, and analytics polling aren&rsquo;t built yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Once a topic is approved in Review, the next missing pieces are: asset sourcing/rendering (
            <code>src/engine/render</code>), YouTube publishing (<code>src/engine/youtube</code>), and the{" "}
            <code>analytics-poll</code> cron that snapshots views/watch time/revenue per published video.
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">{snapshots.length} snapshot(s) recorded.</p>
      )}
    </div>
  );
}
