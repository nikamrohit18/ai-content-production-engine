"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createManualTopic } from "./actions";

type ChannelOption = { id: string; displayName: string };

const CONTEXT_PLACEHOLDER = `Paste anything you've already got — facts, candidate hooks, candidate outlines, source URLs. It doesn't need to be tidy, e.g.:

Hook 1: "The map that shouldn't have existed in 1513."
Hook 2: "He drew Antarctica before anyone knew it was there."

Outline A: Discovery -> the anomaly -> mainstream explanation -> the holdouts
Outline B: Start with the controversy, flash back to the discovery, end unresolved

Source: https://en.wikipedia.org/wiki/Piri_Reis_map`;

export function NewTopicDialog({ channels }: { channels: ChannelOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [format, setFormat] = useState<"short" | "longform">("short");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");

  function reset() {
    setTitle("");
    setContext("");
    setFormat("short");
    setChannelId(channels[0]?.id ?? "");
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Give the topic a working title first");
      return;
    }
    if (!channelId) {
      toast.error("No channel available to assign this topic to");
      return;
    }
    startTransition(async () => {
      try {
        await createManualTopic({
          channelId,
          titleWorking: title.trim(),
          format,
          context: context.trim() || undefined,
        });
        toast.success(`Added "${title.trim()}" to the backlog`);
        reset();
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create topic");
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <AlertDialogTrigger render={<Button size="sm" />}>New topic</AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Add a topic manually</AlertDialogTitle>
          <AlertDialogDescription>
            Drop in a storyline you&rsquo;ve already spotted, with as many candidate hooks, outlines, or source links
            as you have. It gets picked apart, the strongest hook/outline chosen, and run through the same research
            → script → fact-check flow as auto-sourced topics — just tagged &ldquo;manual&rdquo; in the Source column.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-topic-title">Working title</Label>
            <Input
              id="new-topic-title"
              value={title}
              maxLength={256}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The 1513 map that shouldn't have existed"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-topic-context">Topic context (optional, but the more the better)</Label>
            <Textarea
              id="new-topic-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={CONTEXT_PLACEHOLDER}
              rows={10}
              disabled={isPending}
              className="h-64 resize-none overflow-y-auto"
              style={{ fieldSizing: "fixed" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-topic-format">Format</Label>
              <select
                id="new-topic-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as "short" | "longform")}
                disabled={isPending}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              >
                <option value="short">Short</option>
                <option value="longform">Longform</option>
              </select>
            </div>

            {channels.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-topic-channel">Channel</Label>
                <select
                  id="new-topic-channel"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  disabled={isPending}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Analyzing & adding…" : "Add to backlog"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
