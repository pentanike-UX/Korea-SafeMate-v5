"use client";

import { cn } from "@/lib/utils";

export type RouteViewMode = "full" | "segment";

export function SegmentToggle({
  value,
  onChange,
  labels,
  className,
}: {
  value: RouteViewMode;
  onChange: (v: RouteViewMode) => void;
  labels: { full: string; segment: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[color-mix(in_srgb,var(--bg-surface)_88%,transparent)] inline-flex gap-0.5 rounded-full p-1 shadow-[var(--shadow-sm)] ring-1 ring-[var(--border-default)] backdrop-blur-md",
        className,
      )}
      role="tablist"
    >
      {(
        [
          ["full", labels.full],
          ["segment", labels.segment],
        ] as const
      ).map(([k, lab]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200",
            value === k ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]" : "text-[var(--text-strong)]/75 hover:bg-[var(--brand-primary-soft)]",
          )}
        >
          {lab}
        </button>
      ))}
    </div>
  );
}
