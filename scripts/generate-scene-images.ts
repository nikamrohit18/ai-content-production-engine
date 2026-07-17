import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getDb } from "../src/db";
import { deriveShots } from "../src/engine/ai/script";

// "Nano Banana" — a multimodal model, so image bytes come back as content
// parts in result.files rather than through generateImage/experimental_generateImage
// (that path is for image-only models like Imagen/Flux). Calls Google directly via
// @ai-sdk/google (GOOGLE_GENERATIVE_AI_API_KEY), not the Vercel AI Gateway used for
// script generation — this model is gated behind Gateway's paid tier, whereas a
// Google Cloud project's own free-trial credit covers it directly.
const IMAGE_MODEL = google("gemini-2.5-flash-image");
const DELAY_MS = 2000;
const MAX_RETRIES = 3;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flagValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

/** Parses "1,3,5-10" into a Set of 1-indexed scene numbers. */
function parseSceneFilter(spec: string | undefined): Set<number> | null {
  if (!spec) return null;
  const scenes = new Set<number>();
  for (const part of spec.split(",")) {
    const range = part.trim().match(/^(\d+)-(\d+)$/);
    if (range) {
      const [, start, end] = range;
      for (let n = Number(start); n <= Number(end); n++) scenes.add(n);
    } else if (part.trim()) {
      scenes.add(Number(part.trim()));
    }
  }
  return scenes;
}

async function main() {
  const args = process.argv.slice(2);
  const topicArg = args.find((a) => !a.startsWith("--"));
  if (!topicArg) {
    console.log(
      "Usage: npx tsx scripts/generate-scene-images.ts <topicId-or-title> [--out <dir>] [--force] [--scenes 1,3,5-10] [--delay <ms>]",
    );
    process.exitCode = 1;
    return;
  }

  const outDirArg = flagValue(args, "out");
  const force = args.includes("--force");
  const sceneFilter = parseSceneFilter(flagValue(args, "scenes"));
  const delayMs = Number(flagValue(args, "delay") ?? DELAY_MS);

  const db = getDb();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicArg);

  const topic = isUuid
    ? await db.query.topics.findFirst({ where: (t, { eq }) => eq(t.id, topicArg) })
    : await (async () => {
        const matches = await db.query.topics.findMany({
          where: (t, { ilike }) => ilike(t.titleWorking, `%${topicArg}%`),
        });
        if (matches.length > 1) {
          console.log(`"${topicArg}" matches ${matches.length} topics — re-run with the exact topicId:`);
          for (const m of matches) console.log(`  ${m.id}  ${m.titleWorking}`);
          process.exitCode = 1;
          return undefined;
        }
        return matches[0];
      })();

  if (!topic) {
    if (process.exitCode !== 1) {
      console.error(`No topic found matching "${topicArg}"`);
      process.exitCode = 1;
    }
    return;
  }

  const script = await db.query.scripts.findFirst({
    where: (s, { eq }) => eq(s.topicId, topic.id),
    orderBy: (s, { desc }) => [desc(s.version)],
  });
  if (!script) {
    console.error(`No script generated yet for "${topic.titleWorking}"`);
    process.exitCode = 1;
    return;
  }

  const shots = deriveShots(script.beatStructure);
  const aspectRatio = topic.format === "short" ? "9:16" : "16:9";
  const outputDir = outDirArg ?? path.join("generated-images", slugify(topic.titleWorking));
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(
    `Topic: ${topic.titleWorking} (${topic.id})\n${shots.length} scenes · ${topic.format} · ${aspectRatio}\nOutput: ${outputDir}\n`,
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < shots.length; i++) {
    const sceneNum = i + 1;
    if (sceneFilter && !sceneFilter.has(sceneNum)) continue;

    const filename = `scene-${String(sceneNum).padStart(3, "0")}.png`;
    const filepath = path.join(outputDir, filename);

    if (!force && fs.existsSync(filepath)) {
      console.log(`Scene ${sceneNum}/${shots.length}: already exists, skipping (--force to redo)`);
      skipped++;
      continue;
    }

    const shot = shots[i];
    if (!shot.imageGenPrompt) {
      console.log(`Scene ${sceneNum}/${shots.length}: no prompt on this shot, skipping`);
      skipped++;
      continue;
    }

    const prompt = shot.imageGenPrompt;

    let saved = false;
    for (let attempt = 1; attempt <= MAX_RETRIES && !saved; attempt++) {
      try {
        const result = await generateText({
          model: IMAGE_MODEL,
          prompt,
          providerOptions: { google: { imageConfig: { aspectRatio } } },
        });
        const imageFile = result.files.find((f) => f.mediaType?.startsWith("image/"));
        if (!imageFile) throw new Error("Model returned no image content part");
        await fs.promises.writeFile(filepath, imageFile.uint8Array);
        console.log(`Scene ${sceneNum}/${shots.length}: saved -> ${filepath}`);
        generated++;
        saved = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === MAX_RETRIES) {
          console.error(`Scene ${sceneNum}/${shots.length}: failed after ${MAX_RETRIES} attempts — ${message}`);
          failed++;
        } else {
          const backoff = delayMs * attempt;
          console.warn(`Scene ${sceneNum}/${shots.length}: attempt ${attempt} failed (${message}), retrying in ${backoff}ms`);
          await sleep(backoff);
        }
      }
    }

    await sleep(delayMs);
  }

  console.log(`\nDone. Generated ${generated}, skipped ${skipped}, failed ${failed} (of ${shots.length} scenes).`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
