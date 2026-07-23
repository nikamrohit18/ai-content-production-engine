"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkTopicLinks } from "./actions";
import type { LinkCheckResult } from "@/engine/compliance/linkCheck";

const STATUS_LABEL: Record<LinkCheckResult["status"], string> = {
  ok: "reachable",
  broken: "broken",
  redirected: "redirected elsewhere",
  unreachable: "unreachable",
};

const STATUS_VARIANT: Record<LinkCheckResult["status"], "secondary" | "destructive" | "outline"> = {
  ok: "secondary",
  broken: "destructive",
  redirected: "outline",
  unreachable: "destructive",
};

export function LinkCheckPanel({
  topicId,
  links,
}: {
  topicId: string;
  links: Array<{ sourceName: string; sourceUrl: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, LinkCheckResult> | null>(null);

  const uniqueLinks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of links) if (!seen.has(l.sourceUrl)) seen.set(l.sourceUrl, l.sourceName);
    return [...seen.entries()];
  }, [links]);

  if (uniqueLinks.length === 0) return null;

  function handleCheck() {
    startTransition(async () => {
      const r = await checkTopicLinks(topicId);
      setResults(r);
    });
  }

  const brokenCount = results
    ? Object.values(results).filter((r) => r.status !== "ok").length
    : null;

  return (
    <div className="border-border rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Link check
          {brokenCount != null && (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {brokenCount === 0 ? "all reachable" : `${brokenCount} of ${uniqueLinks.length} need a look`}
            </span>
          )}
        </p>
        <Button size="sm" variant="outline" onClick={handleCheck} disabled={isPending}>
          {isPending ? "Checking…" : results ? "Re-check links" : "Check links"}
        </Button>
      </div>
      {results && (
        <ul className="mt-2 space-y-1.5 text-xs">
          {uniqueLinks.map(([url, name]) => {
            const result = results[url];
            return (
              <li key={url} className="flex items-center justify-between gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer" className="truncate underline">
                  {name}
                </a>
                {result ? (
                  <Badge variant={STATUS_VARIANT[result.status]} className="shrink-0">
                    {STATUS_LABEL[result.status]}
                    {result.httpStatus ? ` (${result.httpStatus})` : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    unknown
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
