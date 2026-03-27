import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMockGuardianSeedPoints } from "@/lib/dev/mock-guardian-auth";
import { fetchBalanceSnapshot, fetchLedgerForUser } from "@/lib/points/point-ledger-service";
import { getActivePointPolicy } from "@/lib/points/point-policy-repository";
import { BRAND } from "@/lib/constants";
import { getSessionUserId } from "@/lib/supabase/server-user";
import { PointsHistoryHeading } from "@/components/mypage/mypage-points-history-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Info } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("TravelerPoints");
  return {
    title: `${t("metaTitle")} | ${BRAND.name}`,
    description: t("metaDescription"),
  };
}

function formatPlainP(n: number) {
  return `${n.toLocaleString()}P`;
}

function formatSignedP(n: number) {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toLocaleString()}P`;
}

function eventTitle(t: Awaited<ReturnType<typeof getTranslations>>, ev: string) {
  if (ev === "guardian_profile_reward") return t("evProfile");
  if (ev === "post_publish_reward") return t("evPost");
  if (ev === "post_reward_revoke") return t("evPostRevoke");
  if (ev === "match_complete_reward") return t("evMatch");
  if (ev === "manual_adjustment") return t("evManual");
  return t("evOther");
}

export default async function TravelerPointsPage() {
  const t = await getTranslations("TravelerPoints");
  const th = await getTranslations("TravelerHub");
  const userId = await getSessionUserId();

  if (!userId) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60 rounded-2xl shadow-[var(--shadow-sm)]">
          <CardHeader>
            <CardTitle className="text-lg">{t("needLoginTitle")}</CardTitle>
            <CardDescription>{t("needLoginLead")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-xl font-semibold">
              <Link href="/login">{t("goLogin")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mockSeedPoints = getMockGuardianSeedPoints(userId);

  let balance = 0;
  let earned = 0;
  let revoked = 0;
  let ledger: Awaited<ReturnType<typeof fetchLedgerForUser>> = [];

  if (mockSeedPoints !== null) {
    balance = mockSeedPoints;
    earned = mockSeedPoints;
    revoked = 0;
    const now = Date.now();
    ledger = [
      {
        id: "mock-ledger-profile",
        amount: 300,
        event_type: "guardian_profile_reward",
        reason: "프로필 등록 완료 보너스",
        policy_version: "mock-v1",
        occurred_at: new Date(now - 1000 * 60 * 60 * 24 * 13).toISOString(),
      },
      {
        id: "mock-ledger-post",
        amount: 150,
        event_type: "post_publish_reward",
        reason: "포스트 승인 등록",
        policy_version: "mock-v1",
        occurred_at: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: "mock-ledger-match",
        amount: 200,
        event_type: "match_complete_reward",
        reason: "매칭 완료",
        policy_version: "mock-v1",
        occurred_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
    ] as Awaited<ReturnType<typeof fetchLedgerForUser>>;
  } else {
    const [snap, ledgerFromDb] = await Promise.all([fetchBalanceSnapshot(userId), fetchLedgerForUser(userId, 100)]);
    balance = snap?.balance ?? 0;
    earned = snap?.lifetime_earned ?? 0;
    revoked = snap?.lifetime_revoked ?? 0;
    ledger = ledgerFromDb;
  }

  const policy = await getActivePointPolicy();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed">{t("lead")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 rounded-2xl border-[color-mix(in_srgb,var(--brand-primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--brand-primary-soft)_55%,var(--card))] py-0 shadow-[var(--shadow-sm)] sm:col-span-1">
          <CardContent className="flex flex-col gap-3 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Coins className="text-primary size-5" strokeWidth={1.75} aria-hidden />
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("cardBalance")}</p>
            </div>
            <p className="text-text-strong text-4xl font-semibold tabular-nums tracking-tight sm:text-[2.75rem]">
              {formatPlainP(balance)}
            </p>
            <p className="text-muted-foreground text-sm leading-snug">{t("cardBalanceHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 rounded-2xl py-0 shadow-[var(--shadow-sm)]">
          <CardContent className="p-6 sm:p-7">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("cardLifetimeEarned")}</p>
            <p className="text-text-strong mt-3 text-2xl font-semibold tabular-nums">{formatPlainP(earned)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 rounded-2xl py-0 shadow-[var(--shadow-sm)]">
          <CardContent className="p-6 sm:p-7">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("cardLifetimeRevoked")}</p>
            <p className="text-text-strong mt-3 text-2xl font-semibold tabular-nums">{formatPlainP(revoked)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 rounded-2xl border-dashed py-0 shadow-[var(--shadow-sm)]">
        <CardContent className="flex gap-3 p-5 sm:p-6">
          <Info className="text-muted-foreground mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div>
            <p className="text-foreground text-sm font-semibold">{t("spendComingTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{t("spendComingBody")}</p>
            {policy ? (
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                정책 기준 · 프로필 {policy.profile_signup_reward}P / 포스트 승인 {policy.post_publish_reward}P / 매칭 완료{" "}
                {policy.match_complete_reward}P
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div>
        <PointsHistoryHeading />
        {ledger.length === 0 ? (
          <Card className="border-border/60 rounded-2xl border-dashed py-0 shadow-none">
            <CardContent className="space-y-4 p-6">
              <p className="text-muted-foreground text-sm leading-relaxed">{t("historyEmpty")}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold">
                  <Link href="/mypage/matches">{th("hubQuickMatches")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold">
                  <Link href="/guardians">{th("hubQuickFindGuardian")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="border-border/60 divide-border/60 divide-y overflow-hidden rounded-xl border bg-card">
            {ledger.map((row) => {
              const ev = row.event_type as string;
              return (
                <li key={row.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">{eventTitle(t, ev)}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed break-all">
                      {row.reason ?? "정책 반영"} · {new Date(row.occurred_at).toLocaleString()} · policy: {row.policy_version}
                    </p>
                  </div>
                  <p
                    className={
                      row.amount >= 0
                        ? "text-primary text-lg font-semibold tabular-nums sm:text-right"
                        : "text-destructive text-lg font-semibold tabular-nums sm:text-right"
                    }
                  >
                    {formatSignedP(row.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
