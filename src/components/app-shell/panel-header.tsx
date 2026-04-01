"use client";

import { cn } from "@/lib/utils";

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-border/50 shrink-0 border-b px-5 py-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[var(--text-strong)] text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}
