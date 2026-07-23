"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { amendScriptText } from "./actions";

export function AmendScriptDialog({ scriptId, topicId }: { scriptId: string; topicId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");

  function handleApply() {
    if (!find.trim()) {
      toast.error("Enter the text to find first");
      return;
    }
    startTransition(async () => {
      try {
        const { occurrences } = await amendScriptText(scriptId, topicId, find, replace);
        toast.success(`Replaced ${occurrences} occurrence${occurrences === 1 ? "" : "s"} of "${find.trim()}"`);
        setFind("");
        setReplace("");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to amend script");
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFind("");
          setReplace("");
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
        Fix wording
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Fix a word or phrase</AlertDialogTitle>
          <AlertDialogDescription>
            Replaces every exact occurrence in the narration and description — for small clarity fixes (like adding a
            country to a place name) without a full regeneration.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amend-find">Find (exact text)</Label>
            <Input
              id="amend-find"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Tamil Nadu Coast"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amend-replace">Replace with</Label>
            <Input
              id="amend-replace"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Tamil Nadu Coast, India"
              disabled={isPending}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApply} disabled={isPending}>
            {isPending ? "Applying…" : "Apply"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
