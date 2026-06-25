const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export type PremadeVoice = {
  voiceId: string;
  name: string;
  description: string | null;
  previewUrl: string | null;
  labels: Record<string, string>;
};

type VoicesV2Response = {
  voices?: Array<{
    voice_id: string;
    name: string;
    description?: string | null;
    preview_url?: string | null;
    labels?: Record<string, string>;
  }>;
};

/**
 * Only the "premade" category — ElevenLabs' built-in stock voices, usable
 * immediately with no extra "add to my voices" step. Deliberately excludes
 * "cloned"/"professional" categories since this app never uses a personal
 * cloned voice for channel narration (see decision in project memory).
 */
export async function listPremadeVoices(): Promise<PremadeVoice[]> {
  const params = new URLSearchParams({ category: "premade", page_size: "100" });
  const res = await fetch(`${ELEVENLABS_API_BASE}/v2/voices?${params}`, {
    headers: { "xi-api-key": apiKey() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs list voices failed (${res.status})`);
  const data: VoicesV2Response = await res.json();

  return (data.voices ?? []).map((v) => ({
    voiceId: v.voice_id,
    name: v.name,
    description: v.description ?? null,
    previewUrl: v.preview_url ?? null,
    labels: v.labels ?? {},
  }));
}

export async function textToSpeech(voiceId: string, text: string, modelId = DEFAULT_MODEL_ID): Promise<ArrayBuffer> {
  const res = await fetch(`${ELEVENLABS_API_BASE}/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: modelId }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs text-to-speech failed (${res.status}): ${await res.text()}`);
  return res.arrayBuffer();
}
