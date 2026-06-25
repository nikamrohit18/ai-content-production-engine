"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      {label}
    </Button>
  );
}
