"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GuardianProfileStatus } from "@/lib/auth/guardian-profile-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Heart, Pencil, Shield, Wallet } from "lucide-react";

export function MypageGuardianDashboard({ status }: { status: GuardianProfileStatus }) {
  const t = useTranslations("TravelerHub");

  const primaryCta = (href: string, label: string) => (
    <Button asChild size="lg" className="mt-4 h-12 w-full max-w-sm rounded-[var(--radius-md)] font-semibold sm:w-auto">
      <Link href={href}>{label}</Link>
    </Button>
  );

  if (status === "none") {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-2">
            <Badge variant="outline" className="mb-2 w-fit">
              {t("guardianStatus.none")}
            </Badge>
            <CardTitle className="text-xl">{t("guardianDashNoneTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[15px] leading-relaxed">
            <p className="text-muted-foreground">{t("guardianDashNoneLead")}</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
              <li>{t("guardianDashNoneBenefit1")}</li>
              <li>{t("guardianDashNoneBenefit2")}</li>
              <li>{t("guardianDashNoneBenefit3")}</li>
            </ul>
            {primaryCta("/guardians/apply", t("guardianCtaNone"))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "draft") {
    return (
      <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
        <CardHeader className="pb-2">
          <Badge variant="secondary" className="mb-2 w-fit">
            {t("guardianStatus.draft")}
          </Badge>
          <CardTitle className="text-xl">{t("guardianDashDraftTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-[15px] leading-relaxed">{t("guardianDashDraftLead")}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{t("guardianDashDraftProgressLabel")}</span>
              <span className="text-muted-foreground">{t("guardianDashDraftProgressValue")}</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="bg-[var(--brand-trust-blue)] h-full w-[40%] rounded-full" aria-hidden />
            </div>
          </div>
          {primaryCta("/guardian/onboarding", t("guardianCtaDraft"))}
        </CardContent>
      </Card>
    );
  }

  if (status === "submitted") {
    return (
      <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
        <CardHeader className="pb-2">
          <Badge variant="trust" className="mb-2 w-fit">
            {t("guardianStatus.submitted")}
          </Badge>
          <CardTitle className="text-xl">{t("guardianDashSubmittedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-[15px] leading-relaxed">{t("guardianDashSubmittedLead")}</p>
          <p className="text-muted-foreground border-border/60 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            {t("guardianDashSubmittedSummary")}
          </p>
          {primaryCta("/guardian/profile", t("guardianCtaSubmitted"))}
          <p className="text-muted-foreground text-xs leading-relaxed">{t("guardianCtaSubmittedHint")}</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "approved") {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <Badge variant="featured" className="mb-2 w-fit">
                {t("guardianStatus.approved")}
              </Badge>
              <CardTitle className="text-xl">{t("guardianDashApprovedTitle")}</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-[var(--radius-md)]">
              <Link href="/guardian">{t("guardianNavHub")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["guardianDashStatPosts", "0", FileText],
                  ["guardianDashStatMatching", "0", Heart],
                  ["guardianDashStatDone", "0", Shield],
                  ["guardianDashStatPoints", "—", Wallet],
                ] as const
              ).map(([key, val, Icon]) => (
                <div
                  key={key}
                  className="border-border/60 bg-muted/20 flex flex-col gap-2 rounded-xl border px-4 py-4"
                >
                  <Icon className="text-[var(--brand-trust-blue)] size-5 opacity-90" strokeWidth={1.75} aria-hidden />
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t(key)}</p>
                  <p className="text-text-strong text-2xl font-semibold tabular-nums">{val}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">{t("guardianDashApprovedStatsNote")}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("guardianDashQuickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="default" className="h-12 justify-start gap-2 rounded-[var(--radius-md)] font-semibold">
              <Link href="/guardian/posts/new">
                <FileText className="size-4" aria-hidden />
                {t("guardianDashActionNewPost")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 justify-start gap-2 rounded-[var(--radius-md)] font-semibold">
              <Link href="/guardian/matches">
                <Heart className="size-4" aria-hidden />
                {t("guardianDashActionMatches")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 justify-start gap-2 rounded-[var(--radius-md)] font-semibold">
              <Link href="/mypage/points">
                <Wallet className="size-4" aria-hidden />
                {t("guardianDashActionPoints")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 justify-start gap-2 rounded-[var(--radius-md)] font-semibold">
              <Link href="/guardian/profile/edit">
                <Pencil className="size-4" aria-hidden />
                {t("guardianDashActionEditProfile")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 border-dashed bg-muted/15 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-base font-medium">{t("guardianDashRecentTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{t("guardianDashRecentEmpty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <Card className="rounded-2xl border-destructive/25 shadow-[var(--shadow-sm)]">
        <CardHeader className="pb-2">
          <Badge variant="destructive" className="mb-2 w-fit">
            {t("guardianStatus.rejected")}
          </Badge>
          <CardTitle className="text-xl">{t("guardianDashRejectedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-[15px] leading-relaxed">{t("guardianDashRejectedLead")}</p>
          <div className="border-destructive/20 bg-destructive/5 rounded-xl border px-4 py-3 text-sm">
            <p className="text-muted-foreground text-xs font-semibold uppercase">{t("guardianDashRejectedReasonLabel")}</p>
            <p className="text-foreground mt-1">{t("guardianDashRejectedReasonPlaceholder")}</p>
          </div>
          {primaryCta("/guardian/profile", t("guardianCtaRejected"))}
        </CardContent>
      </Card>
    );
  }

  /* suspended */
  return (
    <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
      <CardHeader className="pb-2">
        <Badge variant="outline" className="mb-2 w-fit">
          {t("guardianStatus.suspended")}
        </Badge>
        <CardTitle className="text-xl">{t("guardianDashSuspendedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-[15px] leading-relaxed">{t("guardianDashSuspendedLead")}</p>
        {primaryCta("/guardian/profile", t("guardianCtaSuspended"))}
        <p className="text-muted-foreground text-xs leading-relaxed">{t("guardianCtaSuspendedHint")}</p>
      </CardContent>
    </Card>
  );
}
