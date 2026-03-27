import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicGuardian } from "@/lib/guardian-public";
import { listPublicGuardiansMerged } from "@/lib/guardian-public-merged.server";
import { guardianProfileImageUrls, GUARDIAN_PROFILE_COVER_POSITION_CLASS } from "@/lib/guardian-profile-images";
import { getTravelerSavedGuardianIds } from "@/lib/traveler-saved-guardians-cookie";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgesServer } from "@/components/forty-two/trust-badges-server";
import { BRAND } from "@/lib/constants";
import { MypageGuardianProfileSheetTrigger } from "@/components/mypage/mypage-guardian-profile-sheet-trigger";
import { Star } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("TravelerHub");
  return { title: `${t("navSavedGuardians")} | ${BRAND.name}` };
}

export default async function TravelerSavedGuardiansPage() {
  const t = await getTranslations("TravelerHub");
  const tTier = await getTranslations("GuardianTier");
  const all = await listPublicGuardiansMerged();
  const cookieIds = await getTravelerSavedGuardianIds();
  const saved = cookieIds.map((id) => all.find((g) => g.user_id === id)).filter(Boolean) as PublicGuardian[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-text-strong text-xl font-semibold">{t("savedGuardiansTitle")}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t("savedGuardiansLead")}</p>
      </div>
      {saved.length === 0 ? (
        <div className="border-border/60 rounded-2xl border border-dashed bg-muted/10 px-6 py-14 text-center">
          <p className="text-foreground text-sm font-semibold">{t("savedGuardiansEmptyTitle")}</p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("savedGuardiansEmptyLead")}</p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/guardians">{t("savedGuardiansBrowse")}</Link>
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {saved.map((g) => {
          const imgs = guardianProfileImageUrls(g);
          return (
            <li key={g.user_id}>
              <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-[var(--shadow-sm)]">
                <div className="flex gap-4 p-4 sm:p-5">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
                    <Image src={imgs.avatar} alt="" fill className={GUARDIAN_PROFILE_COVER_POSITION_CLASS} sizes="96px" />
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-2 p-0">
                    <p className="font-semibold leading-snug">{g.display_name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={guardianTierBadgeVariant(g.guardian_tier)} className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}>
                        {tTier(g.guardian_tier)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{g.headline}</p>
                    <TrustBadgesServer ids={g.trust_badge_ids} size="xs" />
                    {g.avg_traveler_rating != null ? (
                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                        {g.avg_traveler_rating.toFixed(1)}
                      </p>
                    ) : null}
                    <div className="border-border/50 mt-auto flex flex-col gap-2 border-t border-dashed pt-4 sm:flex-row sm:flex-wrap">
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
                        triggerLabel={t("openProfile")}
                        className="h-10 w-full sm:min-w-0 sm:flex-1"
                      />
                      <Button asChild size="sm" variant="outline" className="h-10 w-full rounded-xl sm:min-w-0 sm:flex-1">
                        <Link href={`/book?guardian=${g.user_id}`}>{t("request")}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
