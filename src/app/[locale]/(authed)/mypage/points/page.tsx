import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMockGuardianSeedPoints } from "@/lib/dev/mock-guardian-auth";
import { fetchBalanceSnapshot, fetchLedgerForUser } from "@/lib/points/point-ledger-service";
import { BRAND } from "@/lib/constants";
import { getSessionUserId } from "@/lib/supabase/server-user";
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

export default async function TravelerPointsPage() {
  const t = await getTranslations("TravelerPoints");
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
    ledger = [];
  } else {
    const [snap, ledgerFromDb] = await Promise.all([fetchBalanceSnapshot(userId), fetchLedgerForUser(userId, 100)]);
    balance = snap?.balance ?? 0;
    earned = snap?.lifetime_earned ?? 0;
    revoked = snap?.lifetime_revoked ?? 0;
    ledger = ledgerFromDb;
  }

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
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-text-strong mb-4 text-base font-semibold tracking-tight">{t("historyTitle")}</h3>
        {ledger.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("historyEmpty")}</p>
        ) : (
          <ul className="border-border/60 divide-border/60 divide-y overflow-hidden rounded-xl border bg-card">
            {ledger.map((row) => {
              const ev = row.event_type as string;
              const labelKey =
                ev === "guardian_profile_reward"
                  ? "evProfile"
                  : ev === "post_publish_reward"
                    ? "evPost"
                    : ev === "post_reward_revoke"
                      ? "evPostRevoke"
                      : ev === "match_complete_reward"
                        ? "evMatch"
                        : ev === "manual_adjustment"
                          ? "evManual"
                          : "evOther";
              return (
                <li key={row.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">{t(labelKey)}</p>
                    <p className="text-muted-foreground mt-1 font-mono text-[11px] leading-relaxed break-all">
                      {row.reason ?? row.policy_version} · {new Date(row.occurred_at).toLocaleString()}
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
