"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockContentPosts } from "@/data/mock";
import { postHasRouteJourney } from "@/lib/content-post-route";
import { pickHomeRecommendedGuardians } from "@/lib/home-recommended-guardians";
import type { PublicGuardian } from "@/lib/guardian-public";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextActionLink } from "@/components/ui/text-action";
import { TrustBadgeRow } from "@/components/forty-two/trust-badges";
import { FileText, MapPin } from "lucide-react";
import { useHomeExplorePreferences } from "@/components/home/home-explore-preferences";
import type { ContentPost, GuardianTier } from "@/types/domain";

const TRUST_BADGE_MAX = 4;
const TAG_MAX = 4;

function repBlock(
  g: PublicGuardian,
  locale: string,
): { kind: "post"; post: ContentPost } | { kind: "route"; title: string; blurb: string } | null {
  const postId = g.representative_post_ids[0];
  if (postId) {
    const post = mockContentPosts.find((p) => p.id === postId);
    if (post) return { kind: "post", post };
  }
  const r0 = g.recommended_routes[0];
  if (r0) {
    const title = locale === "ko" ? r0.title.ko : r0.title.en;
    const blurb = locale === "ko" ? r0.blurb.ko : r0.blurb.en;
    return { kind: "route", title, blurb };
  }
  return null;
}

export function HomeRecommendedGuardiansSection() {
  const { area, theme } = useHomeExplorePreferences();
  const t = useTranslations("Home");
  const tTier = useTranslations("GuardianTier");
  const locale = useLocale();
  const isKo = locale === "ko";

  const picks = useMemo(() => pickHomeRecommendedGuardians(area, theme, 3), [area, theme]);

  const moreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (area) p.set("area", area);
    if (theme) p.set("theme", theme);
    const s = p.toString();
    return s ? `/guardians?${s}` : "/guardians";
  }, [area, theme]);

  function positioningLine(g: PublicGuardian) {
    return isKo ? g.positioning.ko : g.positioning.en;
  }

  function tierLabel(tier: GuardianTier) {
    return tTier(tier);
  }

  return (
    <section className="border-border/35 border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16 md:py-20">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              {t("featuredGuardiansSectionTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-[15px]">
              {t("featuredGuardiansSectionLead")}
            </p>
          </div>
          <TextActionLink href={moreHref} className="shrink-0 self-start text-sm sm:text-[15px]">
            {t("recommendedGuardiansViewAll")}
          </TextActionLink>
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 sm:gap-5 md:grid-cols-3">
          {picks.map((g) => {
            const rep = repBlock(g, locale);
            const imgs = guardianProfileImageUrls(g);
            return (
              <article
                key={g.user_id}
                className="border-border/70 bg-card flex flex-col rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-sm)] transition-shadow sm:p-5 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
              >
                <div className="flex gap-4">
                  <div className="border-border/50 relative size-[4.5rem] shrink-0 overflow-hidden rounded-full border bg-muted">
                    {imgs.avatar ? (
                      <Image src={imgs.avatar} alt="" fill className="object-cover object-center" sizes="72px" />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center text-lg font-semibold">
                        {g.display_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-semibold">{g.display_name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={guardianTierBadgeVariant(g.guardian_tier)}
                          className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}
                        >
                          {tierLabel(g.guardian_tier)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-snug">{g.headline}</p>
                    </div>
                  </div>
                </div>

                <p className="text-foreground mt-4 text-sm leading-relaxed">{positioningLine(g)}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.expertise_tags.slice(0, TAG_MAX).map((tag) => (
                    <span
                      key={tag}
                      className="border-border/60 text-muted-foreground rounded-full border bg-transparent px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <TrustBadgeRow ids={g.trust_badge_ids.slice(0, TRUST_BADGE_MAX)} size="xs" className="mt-3" />

                {rep ? (
                  <div className="border-border/50 bg-muted/25 mt-4 rounded-xl border p-3">
                    {rep.kind === "post" ? (
                      <>
                        <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase">
                          {postHasRouteJourney(rep.post) ? (
                            <MapPin className="text-[var(--brand-trust-blue)] size-3 shrink-0" aria-hidden />
                          ) : (
                            <FileText className="text-[var(--brand-trust-blue)] size-3 shrink-0" aria-hidden />
                          )}
                          {postHasRouteJourney(rep.post) ? t("recommendedSpotRouteLabel") : t("recommendedSpotPostLabel")}
                        </p>
                        <Link
                          href={`/posts/${rep.post.id}`}
                          className="text-foreground mt-1 block text-sm font-medium leading-snug underline decoration-[color-mix(in_srgb,var(--brand-trust-blue)_35%,transparent)] decoration-2 underline-offset-[3px] transition-colors hover:decoration-[var(--brand-trust-blue)] hover:text-[var(--link-color)]"
                        >
                          {rep.post.title}
                        </Link>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{rep.post.summary}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase">
                          <MapPin className="text-[var(--brand-trust-blue)] size-3 shrink-0" aria-hidden />
                          {t("recommendedSpotRouteLabel")}
                        </p>
                        <p className="text-foreground mt-1 text-sm font-medium leading-snug">{rep.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{rep.blurb}</p>
                      </>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 flex-1" />
                <Button asChild className="w-full rounded-[var(--radius-md)] font-semibold">
                  <Link href={`/guardians/${g.user_id}`}>{t("recommendedGuardianCardCta")}</Link>
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <TextActionLink href={moreHref} className="text-base">
            {t("recommendedGuardiansMoreCta")}
          </TextActionLink>
        </div>
      </div>
    </section>
  );
}
