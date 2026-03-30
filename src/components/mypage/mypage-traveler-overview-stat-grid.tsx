"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BlockAttentionBadge } from "@/components/mypage/mypage-attention-primitives";
import { useMypageHubContext } from "@/components/mypage/mypage-hub-context";
import { HeartHandshake, Wallet } from "lucide-react";

type Props = {
  openRequestsCount: number;
  savedG: number;
  savedP: number;
  matchActive: number;
  matchPending: number;
  pointsLabel: string;
};

export function TravelerOverviewStatGrid({
  openRequestsCount,
  savedG,
  savedP,
  matchActive,
  matchPending,
  pointsLabel,
}: Props) {
  const t = useTranslations("TravelerHub");
  const ctx = useMypageHubContext();
  const attn = ctx?.snapshot.travelerBlockAttention;
  const unread = ctx?.attention.unreadTravelerNavBadges;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card className="relative rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("statRequests")}</p>
            {openRequestsCount > 0 && (unread?.navJourneys ?? 0) > 0 ? (
              <BlockAttentionBadge count={openRequestsCount} ariaLabel={t("attentionBlockOpenTrips")} />
            ) : null}
          </div>
          <p className="text-text-strong mt-2 text-3xl font-semibold tabular-nums">{openRequestsCount}</p>
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-sm font-semibold">
            <Link href="/mypage/requests">{t("viewAll")}</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("statSavedGuardians")}</p>
            {savedG > 0 && (unread?.navJourneys ?? 0) > 0 ? (
              <BlockAttentionBadge count={savedG} ariaLabel={t("attentionBlockSavedGuardians")} />
            ) : null}
          </div>
          <p className="text-text-strong mt-2 text-3xl font-semibold tabular-nums">{savedG}</p>
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-sm font-semibold">
            <Link href="/mypage/journeys">{t("hubQuickJourneys")}</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("statSavedPosts")}</p>
            {savedP > 0 && (unread?.navJourneys ?? 0) > 0 ? (
              <BlockAttentionBadge count={savedP} ariaLabel={t("attentionBlockSavedPosts")} />
            ) : null}
          </div>
          <p className="text-text-strong mt-2 text-3xl font-semibold tabular-nums">{savedP}</p>
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-sm font-semibold">
            <Link href="/mypage/journeys">{t("hubQuickJourneys")}</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <HeartHandshake className="size-3.5 opacity-80" aria-hidden />
              {t("hubMatchStatLabel")}
            </p>
            {(unread?.navMatches ?? 0) > 0 && (matchPending > 0 || (attn?.matches.reviewDue ?? 0) > 0) && (
              <BlockAttentionBadge
                count={matchPending + (attn?.matches.reviewDue ?? 0)}
                ariaLabel={`${t("attentionBlockMatchesPending")} / ${t("attentionBlockMatchesReview")}`}
              />
            )}
          </div>
          <p className="text-text-strong mt-2 text-3xl font-semibold tabular-nums">{matchActive}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("hubMatchStatPending")}: {matchPending}
          </p>
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-sm font-semibold">
            <Link href="/mypage/matches">{t("hubQuickMatches")}</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <Wallet className="size-3.5 opacity-80" aria-hidden />
              {t("statPointsSummary")}
            </p>
            {(unread?.navPoints ?? 0) > 0 && (attn?.pointsRecentLedgerCount ?? 0) > 0 ? (
              <BlockAttentionBadge
                count={attn?.pointsRecentLedgerCount ?? 0}
                ariaLabel={t("attentionBlockPointsRecent")}
              />
            ) : null}
          </div>
          <p className="text-text-strong mt-2 text-3xl font-semibold tabular-nums">{pointsLabel}</p>
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-sm font-semibold">
            <Link href="/mypage/points">{t("viewAll")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
