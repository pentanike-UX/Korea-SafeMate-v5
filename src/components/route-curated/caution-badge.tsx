"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CautionBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--warning)]",
        className,
      )}
    >
      <AlertTriangle className="size-3" strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}
