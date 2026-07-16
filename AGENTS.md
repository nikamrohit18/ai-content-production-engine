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
