import { getDb } from "@/db";

export type SourcesExport = {
  text: string;
  uniqueSourceCount: number;
  flaggedClaimsCount: number;
};

const VERDICT_ICON: Record<string, string> = {
  supported: "✅",
  unsupported: "❌",
  disputed: "⚠️",
  needs_human_judgment: "❓",
};

/**
 * Formats research_briefs.sources + fact_checks.citations into a plain-text
 * block ready to paste into a YouTube description — both already exist
 * per-topic/per-script, just never surfaced anywhere. Deliberately plain
 * text, not markdown: YouTube descriptions don't render markdown, so "##"
 * or "**bold**" would show as literal characters to viewers. Sources are
 * deduped by URL across the research brief and every claim's own citations,
 * since the same reference often backs both.
 */
export async function buildSourcesExport(topicId: string, scriptId: string): Promise<SourcesExport> {
  const db = getDb();

  const brief = await db.query.researchBriefs.findFirst({
    where: (rb, { eq }) => eq(rb.topicId, topicId),
    orderBy: (rb, { desc }) => [desc(rb.createdAt)],
  });
  const factChecks = await db.query.factChecks.findMany({ where: (fc, { eq }) => eq(fc.scriptId, scriptId) });

  const sourceByUrl = new Map<string, { sourceName: string; sourceUrl: string }>();
  for (const s of brief?.sources ?? []) sourceByUrl.set(s.sourceUrl, s);
  for (const fc of factChecks) {
    for (const c of fc.citations ?? []) sourceByUrl.set(c.sourceUrl, c);
  }
  const sources = [...sourceByUrl.values()];

  const lines: string[] = ["Sources:"];
  for (const s of sources) lines.push(`${s.sourceName} — ${s.sourceUrl}`);

  if (factChecks.length > 0) {
    lines.push("", "Fact-check notes:");
    for (const fc of factChecks) {
      const icon = VERDICT_ICON[fc.verdict] ?? "•";
      lines.push(`${icon} ${fc.verdict.replace(/_/g, " ")}: "${fc.claimText}"`);
      if (fc.reviewerOverride) {
        lines.push(`   human override -> ${fc.reviewerOverride.verdict}: ${fc.reviewerOverride.justification}`);
      }
    }
  }

  return {
    text: lines.join("\n"),
    uniqueSourceCount: sources.length,
    flaggedClaimsCount: factChecks.filter((fc) => fc.verdict !== "supported").length,
  };
}
