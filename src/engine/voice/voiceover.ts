import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { textToSpeech } from "./elevenLabs";

export type GenerateVoiceoverResult = {
  scriptId: string;
  characterCount: number;
  assetId: string;
  blobUrl: string;
};

/**
 * Generates one voiceover audio file for a script's full narration text
 * using the channel's configured premade ElevenLabs voice — never a
 * personal cloned voice (see decision in project memory: a cloned voice
 * undercuts the faceless-channel premise and creates an identity-disclosure
 * complication a stock voice avoids).
 */
export async function generateVoiceoverForScript(scriptId: string): Promise<GenerateVoiceoverResult> {
  const db = getDb();

  const script = await db.query.scripts.findFirst({ where: (s, { eq }) => eq(s.id, scriptId) });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const topic = await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, script.topicId) });
  if (!topic) throw new Error(`Topic ${script.topicId} not found`);

  const channel = await db.query.channels.findFirst({ where: (c, { eq }) => eq(c.id, topic.channelId) });
  if (!channel) throw new Error(`Channel ${topic.channelId} not found`);

  const voiceId = (channel.brandVoiceConfig as { voiceId?: string } | null)?.voiceId;
  if (!voiceId) {
    throw new Error(
      `No voiceId configured in brandVoiceConfig for channel ${channel.id} — pick a voice before generating voiceovers`,
    );
  }

  const audioBytes = await textToSpeech(voiceId, script.fullNarrationText);

  // Idempotent like assetSourcing.ts: a step retry or manual re-generation
  // should replace the existing voiceover row, not duplicate it.
  await db
    .delete(schema.assets)
    .where(and(eq(schema.assets.scriptId, scriptId), eq(schema.assets.assetType, "audio_voiceover")));

  const blob = await put(`assets/${topic.id}/${scriptId}/voiceover.mp3`, Buffer.from(audioBytes), {
    access: "private",
    contentType: "audio/mpeg",
    allowOverwrite: true,
  });

  const characterCount = script.fullNarrationText.length;

  const [asset] = await db
    .insert(schema.assets)
    .values({
      topicId: topic.id,
      scriptId,
      assetType: "audio_voiceover",
      source: "elevenlabs",
      license: "elevenlabs_commercial",
      blobUrl: blob.url,
      blobAccess: "private",
      metadata: { voiceId, characterCount },
    })
    .returning();

  // ElevenLabs is billed as a flat monthly subscription with an included
  // character quota, not metered per request — totalCostUsd is recorded as
  // 0 rather than an invented per-character rate. quantity (characters) is
  // still the number that matters for tracking usage against the quota.
  await db.insert(schema.costLedger).values({
    channelId: channel.id,
    topicId: topic.id,
    provider: "elevenlabs",
    category: "tts_characters",
    quantity: String(characterCount),
    totalCostUsd: "0",
    metadata: { voiceId, scriptId, note: "covered by flat monthly ElevenLabs subscription, not metered per-call" },
  });

  return { scriptId, characterCount, assetId: asset.id, blobUrl: blob.url };
}
