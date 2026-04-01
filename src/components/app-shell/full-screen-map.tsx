"use client";

import { cn } from "@/lib/utils";

export function FullScreenMap({
  children,
  overlays,
  className,
}: {
  children: React.ReactNode;
  overlays?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--bg-page)]", className)}>
      <div className="absolute inset-0 z-0">{children}</div>
      {overlays ? <div className="pointer-events-none absolute inset-0 z-10">{overlays}</div> : null}
    </div>
  );
}
