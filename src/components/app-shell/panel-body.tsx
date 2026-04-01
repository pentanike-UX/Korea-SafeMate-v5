"use client";

import { cn } from "@/lib/utils";

export function PanelBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4", className)}>{children}</div>
  );
}
