"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { approveTopic, rejectTopic } from "./actions";

export function ReviewActions({
  topicId,
  scriptId,
  topicTitle,
}: {
  topicId: string;
  scriptId: string;
  topicTitle: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveTopic(topicId, scriptId);
        toast.success(`Approved "${topicTitle}"`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to approve");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectTopic(topicId, scriptId, notes);
        toast.success(`Rejected "${topicTitle}"`);
        setNotes("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reject");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
          Reject
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject &ldquo;{topicTitle}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Marks the topic and script as rejected. Add a note so the next attempt knows what to fix.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reviewer notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isPending}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button size="sm" onClick={handleApprove} disabled={isPending}>
        Approve
      </Button>
    </div>
  );
}
