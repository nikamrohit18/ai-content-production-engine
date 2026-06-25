import Link from "next/link";
import { getDb } from "@/db";
import { buildProductionPackage } from "@/engine/production/productionPackage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "./copy-button";

const TOOL_RECOMMENDATIONS = [
  {
    category: "Image generation",
    tools: "Nano Banana 2 (Google) for static scenes/illustrations, or Midjourney v7 for a more painterly look.",
  },
  {
    category: "Enhancing the archival reference photo",
    tools:
      "Topaz Photo AI for faithful restoration of real old scans (noise/blur repair). Let's Enhance's \"Old Photo\" preset is a faster alternative. Magnific if you want creative re-imagining rather than restoration. Upscayl is a free option.",
  },
  {
    category: "Assembling the final video",
    tools: "CapCut Desktop (free, auto-captions) for Shorts. DaVinci Resolve (free, no watermark/export limits) for longform.",
  },
] as const;

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function ProductionPackagePage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const db = getDb();

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicId) });
  if (!topic) {
    return <p className="text-muted-foreground py-10 text-center">Topic not found.</p>;
  }

  const script = await db.query.scripts.findFirst({
    where: (s, { eq }) => eq(s.topicId, topicId),
    orderBy: (s, { desc }) => [desc(s.version)],
  });
  if (!script) {
    return <p className="text-muted-foreground py-10 text-center">No script generated for this topic yet.</p>;
  }

  const pkg = await buildProductionPackage(script.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/backlog" className="text-muted-foreground text-sm hover:underline">
          ← Back to Backlog
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{pkg.titleWorking}</h1>
        <p className="text-muted-foreground text-sm">
          Production package · <Badge variant="outline">{pkg.format}</Badge> ·{" "}
          {pkg.dimensions.width}×{pkg.dimensions.height}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voiceover</CardTitle>
        </CardHeader>
        <CardContent>
          {pkg.voiceover ? (
            <div className="flex items-center gap-4 text-sm">
              <span>{formatDuration(pkg.voiceover.durationSec)}</span>
              <span className="text-muted-foreground">{pkg.voiceover.characterCount.toLocaleString()} characters</span>
              <a
                href={`/api/assets/${pkg.voiceover.assetId}/file`}
                download
                className="text-primary hover:underline"
              >
                Download mp3
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Not generated yet — run the render pipeline first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thumbnail prompts</CardTitle>
          <CardDescription>
            3 concepts for an AI image generator, each a different angle on the hook. Export at{" "}
            {pkg.dimensions.width}×{pkg.dimensions.height} to match this video
            {pkg.format === "short" && " (Shorts-eligible channels can upload a vertical custom thumbnail)"} —
            YouTube&rsquo;s general feed/search thumbnail standard is 1280×720 (16:9) regardless of format.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pkg.thumbnailPrompts ? (
            pkg.thumbnailPrompts.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm">{t.concept}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{t.textOverlay}</Badge>
                  <CopyButton text={t.concept} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              This script was generated before thumbnail prompts existed — regenerate the script to get these.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-beat visuals</CardTitle>
          <CardDescription>
            Aligned one-to-one with the narration — each card is the next beat in the story, in order. The timestamp
            on each card is exactly when to cut to that beat&rsquo;s image in your editor (against the downloaded
            voiceover track) and hold it until the next beat&rsquo;s timestamp — that already accounts for the small
            natural pause between lines, so there&rsquo;s no gap. Apply a slow zoom in/out for that whole window;
            alternating direction beat-to-beat reads better than zooming the same way every time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pkg.beats.map((beat) => (
            <div key={beat.beatIndex} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row">
              {beat.referenceImageAssetId && (
                <div className="flex shrink-0 flex-col gap-1 sm:w-32">
                  <img
                    src={`/api/assets/${beat.referenceImageAssetId}/file`}
                    alt={`Reference for ${beat.beatName}`}
                    className="h-40 w-full rounded-md object-cover"
                  />
                  <a
                    href={`/api/assets/${beat.referenceImageAssetId}/file`}
                    download={`${beat.beatName}-reference`}
                    className="text-primary text-center text-xs hover:underline"
                  >
                    Download
                  </a>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {beat.beatName.replace(/_/g, " ")}
                    </Badge>
                    {beat.startSec != null && beat.onScreenUntilSec != null && (
                      <Badge variant="secondary">
                        {formatDuration(beat.startSec)} – {formatDuration(beat.onScreenUntilSec)}
                      </Badge>
                    )}
                  </div>
                  {beat.referenceImageLicense && (
                    <span className="text-muted-foreground text-xs">reference license: {beat.referenceImageLicense}</span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm italic">&ldquo;{beat.narrationText}&rdquo;</p>
                {beat.imageGenPrompt ? (
                  <div className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2">
                    <p className="text-sm">{beat.imageGenPrompt}</p>
                    <CopyButton text={beat.imageGenPrompt} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No image-gen prompt — this script predates the production-package fields.
                  </p>
                )}
                {beat.videoGenPrompt && (
                  <div className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">video (optional): </span>
                      {beat.videoGenPrompt}
                    </p>
                    <CopyButton text={beat.videoGenPrompt} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>YouTube Studio tags</CardTitle>
          <CardDescription>Hidden backend metadata — paste into Studio&rsquo;s &ldquo;Tags&rdquo; field, not the description.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pkg.seo.tags ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {pkg.seo.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div>
                <CopyButton text={pkg.seo.tags.join(", ")} label="Copy tags" />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              This script was generated before SEO tags existed — regenerate the script to get these.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description & sources</CardTitle>
          <CardDescription>
            {pkg.seo.hashtags
              ? `${pkg.seo.hashtags.length} hashtags · `
              : ""}
            {pkg.sources.uniqueSourceCount} sources · {pkg.sources.flaggedClaimsCount} claims flagged for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pkg.seo.description ? (
            <p className="text-sm">{pkg.seo.description}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              This script was generated before a description existed — regenerate the script to get one.
            </p>
          )}
          {pkg.seo.hashtags && (
            <div className="flex flex-wrap gap-1.5">
              {pkg.seo.hashtags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <pre className="bg-muted/50 max-h-80 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {pkg.sources.text}
          </pre>
          <div className="flex gap-2">
            <CopyButton text={pkg.seo.fullDescription} label="Copy full description" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended external tools</CardTitle>
          <CardDescription>For producing visuals outside this platform.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {TOOL_RECOMMENDATIONS.map((rec, i) => (
            <div key={rec.category}>
              {i > 0 && <Separator className="mb-3" />}
              <p className="text-sm font-medium">{rec.category}</p>
              <p className="text-muted-foreground text-sm">{rec.tools}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
