import { getDb } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefillBacklogButton } from "./channels-actions";

export default async function ChannelsPage() {
  const db = getDb();
  const channels = await db.query.channels.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
        <p className="text-muted-foreground text-sm">Channels this engine produces content for.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((channel) => (
          <Card key={channel.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{channel.displayName}</CardTitle>
                  <CardDescription className="capitalize">{channel.niche.replace(/_/g, " ")}</CardDescription>
                </div>
                <Badge variant={channel.isActive ? "secondary" : "outline"}>
                  {channel.isActive ? "active" : "inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Monthly budget cap</p>
                  <p>${Number(channel.monthlyBudgetCapUsd).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Posting cadence</p>
                  <p>
                    {channel.postingCadence?.longformPerWeek ?? 0}/wk longform ·{" "}
                    {channel.postingCadence?.shortsPerDay ?? 0}/day shorts
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">YouTube channel</p>
                  <p>
                    {channel.youtubeChannelId ? (
                      <a
                        href={`https://www.youtube.com/channel/${channel.youtubeChannelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {channel.youtubeChannelId}
                      </a>
                    ) : (
                      "Not linked"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ElevenLabs voice</p>
                  <p>{channel.elevenlabsVoiceId ?? "Not set"}</p>
                </div>
              </div>
              <RefillBacklogButton channelId={channel.id} channelName={channel.displayName} />
            </CardContent>
          </Card>
        ))}
        {channels.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No channels yet. Run <code>npm run db:seed</code> to create the first one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
