"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { AIPlanOutput } from "@/domain/curated-experience";
import { writeGuardianPlannerContext, type GuardianPlannerContextPayload } from "@/lib/v4/guardian-planner-context";

/** Saves planner/route context before navigating (e.g. save flow, guardian request). */
export function persistPlannerContext(payload: GuardianPlannerContextPayload) {
  writeGuardianPlannerContext(payload);
}

export function AskGuardianPanel({
  guardianSlug,
  routeSlug,
  routeTitle,
  plan,
  variant = "primary",
}: {
  guardianSlug: string;
  routeSlug: string;
  routeTitle: string;
  plan?: AIPlanOutput;
  variant?: "primary" | "calmer" | "weather";
}) {
  const t = useTranslations("V4.routeMap.ask");

  const q = new URLSearchParams();
  q.set("route", routeSlug);
  if (plan?.id) q.set("plan", plan.id);
  const href = `/guardians/guide/${guardianSlug}/request?${q.toString()}`;

  return (
    <div className="border-border/60 bg-[var(--bg-surface-subtle)] rounded-[var(--radius-lg)] border p-4">
      <p className="text-[var(--text-strong)] text-sm font-semibold">{t("title")}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t("lead")}</p>
      <Button asChild className="mt-3 w-full rounded-[var(--radius-lg)] sm:w-auto">
        <Link
          href={href}
          onClick={() =>
            writeGuardianPlannerContext({
              plan,
              routeSlug,
              routeTitle,
              variant,
            })
          }
        >
          {t("cta")}
        </Link>
      </Button>
    </div>
  );
}
