"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { markPublished } from "./actions";

export function MarkPublishedButton({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [youtubeUrl, setYoutubeUrl] = useState("");

  function handleConfirm() {
    startTransition(async () => {
      try {
        await markPublished(topicId, youtubeUrl.trim() || undefined);
        toast.success(`Marked "${topicTitle}" as published`);
        setYoutubeUrl("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to mark as published");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
        Mark published
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark &ldquo;{topicTitle}&rdquo; as published?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirms this was actually uploaded to YouTube — moves it out of &ldquo;In Production&rdquo; and into
            &ldquo;Done&rdquo;. Paste the video URL if you have it (optional).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=... (optional)"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            Mark published
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
