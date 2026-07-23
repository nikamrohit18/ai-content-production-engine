"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RunPipelineButton } from "./backlog-actions";
import { MarkPublishedButton } from "./mark-published-button";

export type BacklogRow = {
  id: string;
  titleWorking: string;
  format: string;
  status: string;
  /** Total shots in the latest script, or null if no script exists yet. */
  sceneCount: number | null;
  lengthLabel: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  youtubeUrl: string | null;
  canRunPipeline: boolean;
  hasScript: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  backlog: "outline",
  researching: "secondary",
  scripting: "secondary",
  factchecking: "secondary",
  awaiting_review: "default",
  approved: "secondary",
  rejected: "destructive",
  failed: "destructive",
  in_production: "secondary",
  published: "secondary",
  archived: "outline",
};

const SOURCE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trend_signal: "secondary",
  manual: "outline",
  ai_suggested: "default",
};

const TAB_STATUSES: Record<string, Set<string>> = {
  backlog: new Set(["backlog", "researching", "scripting", "factchecking", "awaiting_review", "approved", "rejected", "failed"]),
  production: new Set(["in_production"]),
  done: new Set(["published", "archived"]),
};

const TAB_LABELS: Record<string, string> = {
  backlog: "Backlog",
  production: "In Production",
  done: "Done",
};

type SortKey = "updated" | "created" | "title";

const SORT_LABELS: Record<SortKey, string> = {
  updated: "Last updated",
  created: "Created date",
  title: "Title A–Z",
};

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth}mo ago`;
}

function defaultTab(rows: BacklogRow[]): string {
  if (rows.some((r) => TAB_STATUSES.production.has(r.status))) return "production";
  if (rows.some((r) => TAB_STATUSES.backlog.has(r.status))) return "backlog";
  return "done";
}

export function BacklogTable({ rows }: { rows: BacklogRow[] }) {
  const [activeTab, setActiveTab] = useState(() => defaultTab(rows));
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { backlog: 0, production: 0, done: 0 };
    for (const row of rows) {
      for (const [tab, statuses] of Object.entries(TAB_STATUSES)) {
        if (statuses.has(row.status)) counts[tab] += 1;
      }
    }
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const statuses = TAB_STATUSES[activeTab] ?? new Set<string>();
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(
      (row) => statuses.has(row.status) && (q === "" || row.titleWorking.toLowerCase().includes(q)),
    );
    return filtered.sort((a, b) => {
      if (sortKey === "title") return a.titleWorking.localeCompare(b.titleWorking);
      if (sortKey === "created") return b.createdAt.getTime() - a.createdAt.getTime();
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [rows, activeTab, search, sortKey]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as string)}>
          <TabsList>
            {Object.keys(TAB_STATUSES).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]} ({tabCounts[tab] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              Sort: {SORT_LABELS[sortKey]}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => setSortKey(key)}>
                  {SORT_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scenes</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Video</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-md truncate font-medium">{row.titleWorking}</TableCell>
                  <TableCell className="capitalize">{row.format}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.sceneCount ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.lengthLabel}</TableCell>
                  <TableCell>
                    <Badge variant={SOURCE_VARIANT[row.source] ?? "outline"}>{row.source.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(row.updatedAt)}</TableCell>
                  <TableCell>
                    {row.youtubeUrl ? (
                      <a
                        href={row.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Watch ↗
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="flex flex-wrap justify-end gap-2 text-right">
                    {row.canRunPipeline && <RunPipelineButton topicId={row.id} topicTitle={row.titleWorking} />}
                    {row.hasScript && (
                      <Link
                        href={`/production/${row.id}`}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        View package
                      </Link>
                    )}
                    {row.status === "in_production" && (
                      <MarkPublishedButton topicId={row.id} topicTitle={row.titleWorking} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground py-10 text-center">
                    {rows.length === 0
                      ? "No topics yet. Seed the backlog or wait for trend sourcing to add some."
                      : "No topics match this tab/search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
