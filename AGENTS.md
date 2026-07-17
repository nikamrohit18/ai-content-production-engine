<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# shadcn/ui in this repo uses Base UI, not Radix

`npx shadcn add` was initialized with style `base-nova` on **Base UI** primitives (`@base-ui/react`), not Radix — so most online examples and training data for shadcn component composition won't match. Composition uses a `render={<Button .../>}` prop instead of Radix's `asChild`/`<Slot>` pattern. Check `src/components/ui/alert-dialog.tsx` for a worked example before assuming Radix APIs apply.

# Server Actions need their own auth check, not just `proxy.ts`

Next.js's own docs warn that a Proxy (`src/proxy.ts`) matcher doesn't independently cover Server Actions — they're handled as POST requests to the page route they're defined on, not a separate matchable route. Every mutating Server Action in `src/app/(dashboard)/**/actions.ts` calls `requireAuth()` (`src/lib/require-auth.ts`) directly as its first line. Any new Server Action must do the same — don't rely on `proxy.ts` alone to gate it.

# Editing `src/db/seed.ts` does nothing until you re-run `npm run db:seed`

`niche_templates` (prompt templates, `scriptFormula`, pacing/length config) lives in Postgres, not in code that ships on deploy — editing the literals in `seed.ts` has zero effect on script generation until you actually run `npm run db:seed` against the target database afterward. The `onConflictDoUpdate` for this table now explicitly overwrites every content column (`scriptFormula`, `*PromptTemplate`, `visualBeatGuidance`, `defaultShortLengthSec`, `defaultLongformLengthSec`) on conflict — it used to only bump `updatedAt`, which silently discarded every prompt/formula edit on re-seed (fixed 2026-07-16, commit `82691a1`). If you ever add a new column to `niche_templates`, add it to that `set:` block too, or edits to it will go the same way.

# Script narration is shot-first — don't reintroduce narration-first generation

`src/engine/ai/script.ts`'s `scriptOutputSchema` does NOT ask the model to generate `narrationText` (per beat) or `fullNarrationText` (whole script) — those are derived in `draftScript()` by concatenating `visualBeats[].narrationSpan` after generation. This is intentional: an earlier version generated narration first and had the model retroactively carve it into shots, which reliably produced shots sized to whole sentences (up to 25s each) regardless of how the pacing instructions were worded — LLM structured-output tends to fill JSON fields in schema-declaration order, so whatever comes before `visualBeats` gets written first and shot-splitting becomes an afterthought. Each shot's `narrationSpan` is the actual unit of spoken-content generation now (target 10-14 words / ~5-6s, hard ceiling 18 words / ~8s at this channel's measured 135 wpm — see `WORDS_PER_MINUTE` in the same file). Don't add `narrationText`/`fullNarrationText` back as independently-generated schema fields — that reopens the exact bug this fixed.

# Scene image generation (`scripts/generate-scene-images.ts`) calls Google directly, not the AI Gateway

Every other model call in this repo (`src/engine/ai/models.ts`) goes through the Vercel AI Gateway via plain `"provider/model"` strings — but `gemini-2.5-flash-image` is gated behind the Gateway's **paid tier** (a Gateway-side restriction, confirmed 2026-07-17: "Free tier users do not have access to this model"). This script instead uses `@ai-sdk/google` directly, authenticated with a standalone `GOOGLE_GENERATIVE_AI_API_KEY` (from `aistudio.google.com/app/apikey`), which is a completely separate credential and billing relationship from `AI_GATEWAY_API_KEY`. Two gotchas discovered getting this working, in case the model/billing landscape shifts again:

- **`@ai-sdk/google` must stay on the same major line as `@ai-sdk/gateway`** (currently `3.x`, matching `ai@6.x`'s `LanguageModelV2/V3` types). `npm install @ai-sdk/google` alone grabs the latest `4.x`, which targets a newer `LanguageModelV4` and fails `tsc` with a `LanguageModelV4 is not assignable to LanguageModel` error. Pin explicitly if this ever needs reinstalling: `npm install @ai-sdk/google@3.0.94` (or whatever `3.x` is current).
- **The Gemini Developer API's billing is NOT the same pool as Google Cloud's general trial/billing credit.** A Cloud Billing account (even an "activated," non-trial one) being linked to the project is necessary but not sufficient — the Gemini API additionally requires its own standalone "Prepay" credit ($10 minimum), bought at `aistudio.google.com/billing`, completely separate from any Cloud trial credit. Symptom if this is missed: `Quota exceeded ... free_tier_requests, limit: 0` (billing not linked/activated) or `Your prepayment credits are depleted` (billing fine, Prepay balance empty) — two different errors, two different fixes.
- **Aspect ratio must be set via `providerOptions.google.imageConfig.aspectRatio`**, not prompt wording — asking for "16:9" in the prompt text is silently ignored and the model defaults to a 1024×1024 square. The provider option reliably produces the documented per-ratio resolution (e.g. 1344×768 for `16:9`).

Run it with `npx tsx scripts/generate-scene-images.ts "<topic title or topicId>" [--out <dir>] [--force] [--scenes 1,3,5-10] [--delay <ms>]` (or `npm run generate:images -- ...`) from the repo root, in any terminal. It's a fully standalone, optional CLI — reads scenes from the DB, writes PNGs straight to a local folder (default `generated-images/<topic-slug>/`, gitignored), and never writes anything back to the database. Skips scenes whose file already exists unless `--force`, so it's always safe to just rerun the same command after an interruption.

`--scenes` takes a comma-separated list of scene numbers and/or `start-end` ranges (e.g. `--scenes 5,12,30-35`) — use it to generate in reviewable batches instead of all N scenes in one run, e.g. for a 100-scene script:
```
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 1-20
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 21-40
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 41-60
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 61-80
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 81-100
```
**Redo a scene you don't like:** `--force` overrides the default skip-if-exists behavior. Combine it with `--scenes` so only that one scene gets regenerated instead of redoing everything:
```
npx tsx scripts/generate-scene-images.ts "<title>" --scenes 47 --force
```
Without `--scenes`, `--force` regenerates and overwrites every scene in range (or all of them), so scope it narrowly for a single redo.

**Save outside the repo folder:** `--out` accepts any absolute path, not just a subfolder of the project — useful for saving straight into wherever the video is actually being edited (e.g. a project folder on another drive). The directory is created automatically if it doesn't exist. Quote the path if it contains spaces:
```
npx tsx scripts/generate-scene-images.ts "<title>" --out "D:\Videos\Roman Technology\images"
```
This only changes where files are written — DB reads and scene numbering stay the same either way.
