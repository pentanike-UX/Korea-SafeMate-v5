import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppAccountRole } from "@/lib/auth/app-role";
import type { StoredMatchRequest } from "@/lib/traveler-match-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MypageMatchesEmpty } from "@/components/mypage/mypage-matches-empty";
import { TravelerMatchCompleteButton } from "@/components/mypage/match-request-row-actions";

function statusVariant(s: StoredMatchRequest["status"]): "default" | "secondary" | "outline" {
  if (s === "completed") return "secondary";
  if (s === "accepted") return "default";
  return "outline";
}

export async function MypageMatchesView({
  appRole,
  items,
  hasTravelerSession,
}: {
  appRole: AppAccountRole;
  items: StoredMatchRequest[];
  hasTravelerSession: boolean;
}) {
  const t = await getTranslations("TravelerHub");

  const pending = items.filter((r) => r.status === "requested");
  const active = items.filter((r) => r.status === "accepted");
  const done = items.filter((r) => r.status === "completed");

  if (!hasTravelerSession) {
    if (appRole === "guardian") {
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("matchesPageTitle")}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-relaxed">{t("matchesPageLead")}</p>
          </div>
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="space-y-4 p-6">
              <p className="text-muted-foreground text-sm leading-relaxed">{t("matchesGuardianOnlySession")}</p>
              <Button asChild className="h-11 rounded-xl font-semibold">
                <Link href="/guardian/matches">{t("matchesOpenGuardianMatches")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("matchesPageTitle")}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-relaxed">{t("matchesPageLead")}</p>
        </div>
        <Card className="border-border/60 rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <p className="text-muted-foreground text-sm leading-relaxed">{t("matchesNeedLogin")}</p>
            <Button asChild className="h-11 rounded-xl font-semibold">
              <Link href="/login">{t("goLogin")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("matchesPageTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-relaxed">{t("matchesPageLead")}</p>
        <p className="mt-3 text-sm">
          <Link href="/mypage/requests" className="text-primary font-semibold underline-offset-4 hover:underline">
            {t("matchesSeeTripRequests")}
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60 rounded-2xl shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-2">
            <CardDescription>{t("matchesSummaryActive")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{active.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 rounded-2xl shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-2">
            <CardDescription>{t("matchesSummaryPending")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{pending.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 rounded-2xl shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-2">
            <CardDescription>{t("matchesSummaryCompleted")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{done.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {items.length === 0 ? (
        <MypageMatchesEmpty appRole={appRole} />
      ) : (
        <div className="space-y-8">
          <MatchSection title={t("matchesSectionActive")} rows={active} t={t} showComplete />
          <MatchSection title={t("matchesSectionPending")} rows={pending} t={t} showComplete={false} />
          <MatchSection title={t("matchesSectionCompleted")} rows={done} t={t} showComplete={false} />
        </div>
      )}
    </div>
  );
}

function MatchSection({
  title,
  rows,
  t,
  showComplete,
}: {
  title: string;
  rows: StoredMatchRequest[];
  t: Awaited<ReturnType<typeof getTranslations>>;
  showComplete: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="border-border/60 rounded-2xl py-0 shadow-[var(--shadow-sm)]">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-foreground font-medium">
                      {r.guardian_display_name || r.guardian_user_id}
                    </p>
                    <Badge variant={statusVariant(r.status)} className="text-[10px] font-semibold">
                      {t(`matchStatus.${r.status}`)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] break-all">{r.id}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
                    <Link href={`/guardians/${r.guardian_user_id}`}>{t("openGuardian")}</Link>
                  </Button>
                  {showComplete && r.status === "accepted" ? <TravelerMatchCompleteButton matchId={r.id} /> : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
