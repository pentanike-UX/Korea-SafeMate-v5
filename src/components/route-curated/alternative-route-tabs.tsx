"use client";

import { cn } from "@/lib/utils";

export type AlternativeTabId = "primary" | "calmer" | "weather";

export function AlternativeRouteTabs({
  value,
  onChange,
  labels,
  disabled,
  className,
}: {
  value: AlternativeTabId;
  onChange: (v: AlternativeTabId) => void;
  labels: Record<AlternativeTabId, string>;
  /** Per-tab disabled (e.g. no alternative route for calmer). */
  disabled?: Partial<Record<AlternativeTabId, boolean>>;
  className?: string;
}) {
  const keys: AlternativeTabId[] = ["primary", "calmer", "weather"];
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {keys.map((k) => {
        const isDisabled = Boolean(disabled?.[k]);
        const selected = value === k;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={isDisabled}
            title={isDisabled ? labels[k] : undefined}
            onClick={() => {
              if (!isDisabled) onChange(k);
            }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
              selected && !isDisabled
                ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
                : isDisabled
                  ? "cursor-not-allowed bg-muted/50 text-muted-foreground/60 ring-1 ring-[var(--border-default)]"
                  : "bg-card text-[var(--text-strong)]/80 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
            )}
          >
            {labels[k]}
          </button>
        );
      })}
    </div>
  );
}
