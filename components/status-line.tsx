import { AlertCircle, Check, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Status = { kind: "idle" } | { kind: "info" | "working" | "success" | "error"; text: string };

export function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  const tone =
    status.kind === "success"
      ? "text-indicator-active"
      : status.kind === "error"
        ? "text-destructive"
        : "text-muted-foreground";
  const Icon =
    status.kind === "working"
      ? Loader2
      : status.kind === "success"
        ? Check
        : status.kind === "error"
          ? AlertCircle
          : Info;
  return (
    <p className={cn("flex items-center gap-1.5 text-xs", tone)}>
      <Icon className={cn("size-3.5 shrink-0", status.kind === "working" && "animate-spin")} aria-hidden="true" />
      <span>{status.text}</span>
    </p>
  );
}
