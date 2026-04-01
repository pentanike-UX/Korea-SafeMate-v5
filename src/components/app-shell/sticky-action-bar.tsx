"use client";

import { cn } from "@/lib/utils";

export function StickyActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div
      className={cn(
        "border-border/50 bg-[color-mix(in_srgb,var(--bg-surface)_98%,transparent)] shrink-0 border-t px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
