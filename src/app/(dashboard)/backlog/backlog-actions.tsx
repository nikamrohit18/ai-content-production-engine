"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerPipeline } from "./actions";

export function RunPipelineButton({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await triggerPipeline(topicId);
        toast.success(`Pipeline started for "${topicTitle}"`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start pipeline");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? "Starting…" : "Run pipeline"}
    </Button>
  );
}
