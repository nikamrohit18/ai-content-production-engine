// TEMP: claude-sonnet-4.6 requires paid AI Gateway credits (not in the free tier).
// Using the free-tier-eligible claude-haiku-4.5 for now to verify the pipeline end-to-end
// at zero cost. Switch back to sonnet-4.6 (or another model) once ready to spend on real content.
export const RESEARCH_MODEL = "anthropic/claude-haiku-4.5";
// Switched to sonnet-4.6 (2026-07-16): haiku was undershooting the longform word-count
// target by ~50% (799 vs 1620 words) even with explicit length instructions — likely
// haiku defaulting to terser output rather than a prompt-wording problem. Real $ cost now.
export const SCRIPT_MODEL = "anthropic/claude-sonnet-4.6";
export const FACTCHECK_MODEL = "anthropic/claude-haiku-4.5";
