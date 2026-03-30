"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export function PostDetailIntroPanel({
  variant,
  primary,
  secondary,
}: {
  variant: "article" | "route";
  primary: string;
  /** e.g. recommended traveler types joined */
  secondary?: string | null;
}) {
  const t = useTranslations("Posts");
  const tRoute = useTranslations("RoutePosts");

  if (variant === "article") {
    const p = primary.trim();
    if (!p) return null;
    return (
      <Card className="border-border/60 rounded-2xl border bg-white/90 shadow-[var(--shadow-sm)]">
        <CardContent className="space-y-2 p-5 sm:p-6">
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">{t("detailIntroEyebrow")}</p>
          <p className="text-foreground text-[15px] leading-relaxed sm:text-base">{p}</p>
        </CardContent>
      </Card>
    );
  }

  const p = primary.trim();
  const s = secondary?.trim() ?? "";

  return (
    <Card className="border-border/60 rounded-2xl border bg-white/90 shadow-[var(--shadow-sm)]">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">{t("detailIntroEyebrow")}</p>
        {p ? <p className="text-foreground text-[15px] leading-relaxed sm:text-base">{p}</p> : null}
        {!p && s ? (
          <p className="text-foreground text-[15px] leading-relaxed sm:text-base">{tRoute("introFallbackNoLead")}</p>
        ) : null}
        {!p && !s ? (
          <p className="text-muted-foreground text-sm leading-relaxed">{tRoute("introFallbackMinimal")}</p>
        ) : null}
        {s ? (
          <div className="border-border/50 rounded-xl border bg-muted/20 px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">{tRoute("introForWhoLabel")}</p>
            <p className="text-foreground mt-1 text-sm font-medium leading-relaxed">{s}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
