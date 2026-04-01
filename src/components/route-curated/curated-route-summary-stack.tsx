"use client";

import { useTranslations } from "next-intl";
import type { CuratedRoute } from "@/domain/curated-experience";
import { CautionBadge } from "@/components/route-curated/caution-badge";
import { cn } from "@/lib/utils";

export function CuratedRouteSummaryStack({
  route,
  pathStats,
  timingLines,
  cautionLines,
  className,
}: {
  route: CuratedRoute;
  pathStats: { distanceMeters: number; durationMinutes: number };
  timingLines: string[];
  cautionLines: string[];
  className?: string;
}) {
  const t = useTranslations("V4.routeMap.summary");
  const stayTotal = route.stops.reduce((s, x) => s + x.stayMinutes, 0);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-3 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)] p-4 ring-1 ring-[var(--border-default)]">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{t("tier1Label")}</p>
          <p className="text-[var(--text-strong)] mt-1 text-lg font-semibold tabular-nums">
            {t("totalGuideTime", { minutes: route.durationMinutes })}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{t("totalGuideHint")}</p>
        </div>
        <div className="border-border/50 border-t pt-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{t("movementLabel")}</p>
          <p className="text-foreground mt-1 text-sm font-medium tabular-nums">
            {t("movementLine", {
              walkMin: pathStats.durationMinutes,
              km: (pathStats.distanceMeters / 1000).toFixed(1),
            })}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t("movementDisclaimer")}</p>
        </div>
        <div className="border-border/50 border-t pt-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{t("stayLabel")}</p>
          <p className="text-foreground mt-1 text-sm tabular-nums">{t("stayLine", { minutes: stayTotal })}</p>
        </div>
      </div>

      {route.bestFor.length > 0 ? (
        <section>
          <h3 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase">{t("bestFor")}</h3>
          <ul className="flex flex-wrap gap-2">
            {route.bestFor.map((x) => (
              <li
                key={x}
                className="text-[var(--text-strong)] rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-xs font-medium ring-1 ring-[color-mix(in_srgb,var(--border-default)_80%,transparent)]"
              >
                {x}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {timingLines.length > 0 ? (
        <section>
          <h3 className="text-[var(--text-strong)] mb-2 text-xs font-semibold tracking-wide uppercase">{t("timingHeading")}</h3>
          <ul className="text-muted-foreground space-y-1.5 text-sm leading-relaxed">
            {timingLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[var(--brand-trust-blue)] shrink-0">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cautionLines.length > 0 ? (
        <section>
          <h3 className="text-[var(--text-strong)] mb-2 text-xs font-semibold tracking-wide uppercase">{t("cautionHeading")}</h3>
          <ul className="flex flex-wrap gap-2">
            {cautionLines.map((x) => (
              <li key={x}>
                <CautionBadge>{x}</CautionBadge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
