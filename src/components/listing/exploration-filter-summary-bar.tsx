"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X } from "lucide-react";

export type ExplorationSummaryChip = {
  id: string;
  label: string;
  onClear: () => void;
};

/**
 * Single-row sticky summary: active filters as removable chips (left, horizontal scroll),
 * result count + reset + “open filters” (right). Shared by posts & guardians listing pages.
 */
export function ExplorationFilterSummaryBar({
  chips,
  allExploringLabel,
  resultSummary,
  resultSummaryShort,
  showReset,
  resetLabel,
  onReset,
  openFiltersLabel,
  onOpenFilters,
  summaryAriaLabel,
  chipClearLabel,
}: {
  chips: ExplorationSummaryChip[];
  allExploringLabel: string;
  /** Full results line, e.g. “12 posts” — shown sm+ */
  resultSummary: string;
  /** Compact e.g. “12” or “12명” for narrow screens */
  resultSummaryShort: string;
  showReset: boolean;
  resetLabel: string;
  onReset: () => void;
  openFiltersLabel: string;
  onOpenFilters: () => void;
  summaryAriaLabel: string;
  chipClearLabel: (label: string) => string;
}) {
  return (
    <div className="flex min-h-11 flex-nowrap items-center gap-2 sm:min-h-12 sm:gap-2.5" aria-label={summaryAriaLabel}>
      <div
        className={cn(
          "border-border/60 bg-muted/35 flex min-h-10 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto rounded-[var(--radius-md)] border px-2 py-1.5 sm:min-h-11 sm:gap-2 sm:px-2.5 sm:py-2",
          "[-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden",
        )}
      >
        {chips.length === 0 ? (
          <span className="text-muted-foreground px-1 py-0.5 text-[11px] font-medium sm:text-xs">{allExploringLabel}</span>
        ) : (
          chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={c.onClear}
              aria-label={chipClearLabel(c.label)}
              className={cn(
                "border-primary/20 bg-primary text-primary-foreground shadow-sm",
                "inline-flex h-8 max-w-[min(240px,70vw)] shrink-0 items-center gap-1 rounded-full border px-2.5 pl-3 text-[11px] font-semibold",
                "active:scale-[0.98] sm:h-8 sm:max-w-[min(260px,40vw)] sm:text-xs",
              )}
            >
              <span className="min-w-0 truncate">{c.label}</span>
              <X className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
            </button>
          ))
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <span
          className="text-muted-foreground tabular-nums text-[11px] font-semibold sm:hidden"
          title={resultSummary}
        >
          {resultSummaryShort}
        </span>
        <span className="text-muted-foreground hidden max-w-[7rem] truncate text-xs font-medium tabular-nums sm:inline md:max-w-[10rem] lg:max-w-none" title={resultSummary}>
          {resultSummary}
        </span>
        {showReset ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs font-semibold" onClick={onReset}>
            {resetLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border/80 bg-background h-9 shrink-0 gap-1.5 rounded-[var(--radius-md)] px-2.5 text-xs font-semibold shadow-sm sm:px-3"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="text-muted-foreground size-3.5" aria-hidden />
          {openFiltersLabel}
        </Button>
      </div>
    </div>
  );
}
