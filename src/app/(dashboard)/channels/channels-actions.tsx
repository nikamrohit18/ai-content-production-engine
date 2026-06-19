"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refillBacklog } from "./actions";

export function RefillBacklogButton({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await refillBacklog(channelId);
        toast.success(`Backlog refill started for ${channelName}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start refill");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? "Starting…" : "Refill backlog now"}
    </Button>
  );
}
