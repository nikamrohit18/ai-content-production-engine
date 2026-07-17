"use client";

import { Button } from "@/components/ui/button";

type ShotForExport = {
  beatName: string;
  imageGenPrompt: string | null;
  startSec: number | null;
  onScreenUntilSec: number | null;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function durationLabel(shot: ShotForExport): string {
  if (shot.startSec == null || shot.onScreenUntilSec == null) return "";
  const dur = Math.max(0, shot.onScreenUntilSec - shot.startSec);
  return ` · ${dur.toFixed(1)}s`;
}

export function DownloadPromptsButton({
  titleWorking,
  shots,
}: {
  titleWorking: string;
  shots: ShotForExport[];
}) {
  function handleClick() {
    const header = `${titleWorking} — Image Prompts (${shots.length} scenes)\n`;
    const body = shots
      .map((shot, i) => {
        const prompt = shot.imageGenPrompt ?? "— no prompt generated —";
        return `Scene ${i + 1} — ${shot.beatName.replace(/_/g, " ")}${durationLabel(shot)}\n${prompt}`;
      })
      .join("\n\n");
    const text = `${header}\n${body}\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(titleWorking)}-image-prompts.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      Download all prompts (.txt)
    </Button>
  );
}
