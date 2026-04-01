"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TimingInfoRow } from "@/components/route-curated/timing-info-row";

export function StopCard({
  order,
  title,
  whyHere,
  stayMinutes,
  transitionHint,
  active,
  onSelect,
  segmentMeta,
  className,
}: {
  order: number;
  title: string;
  whyHere: string;
  stayMinutes: number;
  transitionHint: string;
  active: boolean;
  onSelect: () => void;
  segmentMeta?: { distanceM: number; walkMin: number } | null;
  className?: string;
}) {
  const t = useTranslations("V4.routeMap.stopCard");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-lg)] border text-left transition-[box-shadow,transform,border-color] duration-200",
        active
          ? "border-[var(--brand-trust-blue)] bg-[var(--brand-trust-blue-soft)] shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--brand-trust-blue)_35%,transparent)]"
          : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-sm",
        className,
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-transform duration-200",
              active ? "scale-105 bg-[var(--brand-trust-blue)] text-white" : "bg-[var(--brand-primary-soft)] text-[var(--text-strong)]",
            )}
          >
            {order}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[var(--text-strong)] font-semibold leading-snug">{title}</h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{whyHere}</p>
            <div className="mt-3 space-y-2">
              <TimingInfoRow label={t("onSite")} value={t("stayMinutes", { n: stayMinutes })} />
              <TimingInfoRow label={t("expectedMove")} value={transitionHint} />
              {segmentMeta ? (
                <p className="text-muted-foreground pl-6 text-xs leading-snug tabular-nums">
                  {t("legHint", { meters: segmentMeta.distanceM, minutes: segmentMeta.walkMin })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
