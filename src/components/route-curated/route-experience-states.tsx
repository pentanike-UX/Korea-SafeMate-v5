"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RouteExperienceEmpty({
  title,
  description,
  ctaHref,
  ctaLabel,
  className,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card flex flex-col items-center justify-center rounded-[var(--radius-card)] border px-6 py-14 text-center shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--border-default)_70%,transparent)]",
        className,
      )}
    >
      <div className="bg-[var(--bg-surface-subtle)] mb-4 flex size-14 items-center justify-center rounded-2xl text-2xl" aria-hidden>
        ◎
      </div>
      <h2 className="text-[var(--text-strong)] max-w-sm text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">{description}</p>
      <Button asChild className="mt-6 rounded-[var(--radius-lg)]">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}

export function RouteExperienceFault({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-[color-mix(in_srgb,var(--error-soft)_55%,var(--bg-surface))] flex flex-col items-center justify-center rounded-[var(--radius-card)] border px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <h2 className="text-[var(--text-strong)] max-w-sm text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="rounded-[var(--radius-lg)]">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button asChild variant="outline" className="rounded-[var(--radius-lg)]">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function RouteMapFault({
  message,
  onRetry,
  retryLabel,
  className,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] bg-[var(--bg-surface-subtle)] px-4 text-center text-sm",
        className,
      )}
      role="alert"
    >
      <p className="text-[var(--text-strong)] max-w-xs font-medium">{message}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" className="rounded-[var(--radius-lg)]" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
