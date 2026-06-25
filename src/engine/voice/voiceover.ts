import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { textToSpeechWithTimestamps } from "./elevenLabs";
import { cleanNarrationText } from "@/engine/ai/script";

export type GenerateVoiceoverResult = {
  scriptId: string;
  characterCount: number;
  durationSec: number;
  assetId: string;
  blobUrl: string;
};

export type BeatTiming = { beatIndex: number; beatName: string; startSec: number; endSec: number };

/**
 * Maps each beat's narration to its [startSec, endSec) window within the
 * single continuous voiceover track, using ElevenLabs' character-level
 * alignment rather than the script's estDurationSec guesses — those are an
 * LLM estimate at script-generation time, not measured against how fast the
 * voice actually speaks, and would drift from the real audio.
 */
function computeBeatTimings(
  beatStructure: Array<{ beatName: string; narrationText: string }>,
  fullNarrationText: string,
  startTimes: number[],
  endTimes: number[],
): BeatTiming[] {
  let searchOffset = 0;
  return beatStructure.map((beat, beatIndex) => {
    const cleaned = cleanNarrationText(beat.narrationText);
    const idx = fullNarrationText.indexOf(cleaned, searchOffset);
    if (idx === -1) {
      throw new Error(
        `Beat "${beat.beatName}" narrationText not found in fullNarrationText after cleaning — script generation produced inconsistent text`,
      );
    }
    searchOffset = idx + cleaned.length;
    return { beatIndex, beatName: beat.beatName, startSec: startTimes[idx], endSec: endTimes[searchOffset - 1] };
  });
}

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

  const { audioBytes, startTimes, endTimes } = await textToSpeechWithTimestamps(voiceId, script.fullNarrationText);
  const beatTimings = computeBeatTimings(script.beatStructure, script.fullNarrationText, startTimes, endTimes);
  const durationSec = endTimes[endTimes.length - 1];

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
      metadata: { voiceId, characterCount, durationSec, beatTimings },
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

  return { scriptId, characterCount, durationSec, assetId: asset.id, blobUrl: blob.url };
}
