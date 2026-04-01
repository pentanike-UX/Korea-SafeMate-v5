"use client";

import { cn } from "@/lib/utils";

export function RouteSummaryCard({
  title,
  summary,
  mood,
  className,
  empty,
}: {
  title: string;
  summary: string;
  mood?: string;
  className?: string;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className={cn("bg-muted/40 rounded-[var(--radius-card)] p-5 text-sm text-[var(--text-secondary)]", className)}>
        No summary available.
      </div>
    );
  }
  return (
    <div className={cn("bg-card ring-border/60 rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-sm)] ring-1", className)}>
      <h2 className="text-[var(--text-strong)] text-lg font-semibold leading-snug">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{summary}</p>
      {mood ? (
        <p className="text-muted-foreground mt-3 text-xs">
          <span className="text-[var(--text-strong)] font-medium">Mood · </span>
          {mood}
        </p>
      ) : null}
    </div>
  );
}
