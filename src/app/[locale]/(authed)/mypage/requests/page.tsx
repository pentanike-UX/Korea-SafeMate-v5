import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { mockTravelerTripRequests } from "@/data/mock";
import { mockGuardians } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { isMockGuardianId } from "@/lib/dev/mock-guardian-auth";
import { getSupabaseAuthUserIdOnly } from "@/lib/supabase/server-user";
import { getMatchRequestsForTraveler } from "@/lib/traveler-match-requests.server";
import { requestStatusChipClass, type RequestTimelineStatus } from "@/lib/mypage-status-badge";
import { MypageGuardianProfileSheetTrigger } from "@/components/mypage/mypage-guardian-profile-sheet-trigger";

function requestTypeFromTheme(themeSlug: string) {
  if (themeSlug.includes("night")) return "half_day";
  if (themeSlug.includes("safe")) return "consult";
  return "day";
}

function formatTypeLabel(type: "half_day" | "day" | "consult") {
  if (type === "half_day") return "반나절";
  if (type === "consult") return "문의";
  return "하루";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function requestStatusLabel(t: Awaited<ReturnType<typeof getTranslations>>, status: RequestTimelineStatus) {
  if (status === "completed") return "완료됨";
  if (status === "cancelled") return "취소됨";
  return t(`status.${status}`);
}

export async function generateMetadata() {
  const t = await getTranslations("TravelerHub");
  return { title: `${t("navRequests")} | ${BRAND.name}` };
}

export default async function TravelerRequestsPage() {
  const t = await getTranslations("TravelerHub");
  const tThemes = await getTranslations("ExperienceThemes");
  const travelerId = await getSupabaseAuthUserIdOnly();
  const useMock = !travelerId || isMockGuardianId(travelerId);
  const matchRows = travelerId && !useMock ? await getMatchRequestsForTraveler(travelerId) : [];
  const rows: Array<{
    id: string;
    status: RequestTimelineStatus;
    region_label_key: "gwanghwamun" | "gangnam";
    theme_slug: string;
    note: string;
    guardian_user_id: string | null;
    guardian_name: string | null;
    requested_at: string;
    status_changed_at: string;
    request_type: "half_day" | "day" | "consult";
  }> = useMock
    ? mockTravelerTripRequests.map((r) => ({
        id: r.id,
        status: r.status,
        region_label_key: r.region_label_key,
        theme_slug: r.theme_slug,
        note: r.note,
        guardian_user_id: r.guardian_user_id,
        guardian_name: r.guardian_name,
        requested_at: r.created_at,
        status_changed_at: r.created_at,
        request_type: requestTypeFromTheme(r.theme_slug),
      }))
    : matchRows.map((m) => ({
        id: m.id,
        status: m.status === "accepted" ? "matched" : m.status === "completed" ? "completed" : "requested",
        region_label_key: "gwanghwamun" as const,
        theme_slug: "safe_solo",
        note: t("matchesPageLead"),
        guardian_user_id: m.guardian_user_id,
        guardian_name: m.guardian_display_name ?? null,
        requested_at: m.created_at,
        status_changed_at: m.updated_at,
        request_type: "consult" as const,
      }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-text-strong text-xl font-semibold">{t("requestsTitle")}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t("requestsLead")}</p>
      </div>
      <ul className="space-y-4">
        {rows.map((r) => {
          const g = r.guardian_user_id ? mockGuardians.find((x) => x.user_id === r.guardian_user_id) : null;
          const theme = tThemes.raw(r.theme_slug) as { title: string } | undefined;
          return (
            <li key={r.id}>
              <Card className="rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-full text-[11px] font-semibold ${requestStatusChipClass(r.status)}`}
                      >
                        {requestStatusLabel(t, r.status)}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{t(`region.${r.region_label_key}`)} · {formatTypeLabel(r.request_type)}</span>
                    </div>
                    <p className="font-medium">{theme?.title ?? r.theme_slug}</p>
                    <p className="text-muted-foreground text-sm">{r.note}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t("assignedGuardian")}: {g?.display_name ?? r.guardian_name ?? t("noGuardianYet")}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      요청 시점: {formatDate(r.requested_at)} · 마지막 상태 변경: {formatDate(r.status_changed_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    {g ? (
                      <MypageGuardianProfileSheetTrigger
                        guardian={{
                          user_id: g.user_id,
                          display_name: g.display_name,
                          headline: g.headline,
                          primary_region_slug: g.primary_region_slug,
                          guardian_tier: g.guardian_tier,
                          photo_url: g.photo_url,
                          avatar_image_url: g.avatar_image_url,
                          list_card_image_url: g.list_card_image_url,
                          detail_hero_image_url: g.detail_hero_image_url,
                        }}
                        triggerLabel={t("openGuardian")}
                      />
                    ) : null}
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href="/guardians">{t("findGuardian")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
