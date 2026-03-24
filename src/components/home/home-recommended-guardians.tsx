"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockContentPosts } from "@/data/mock";
import { postHasRouteJourney } from "@/lib/content-post-route";
import { pickHomeRecommendedGuardians } from "@/lib/home-recommended-guardians";
import type { PublicGuardian } from "@/lib/guardian-public";
import { guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustBadgeRow } from "@/components/forty-two/trust-badges";
import { ChevronRight, MapPin } from "lucide-react";
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
    <section className="border-border/35 border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-text-strong text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("featuredGuardiansSectionTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-[15px]">
              {t("featuredGuardiansSectionLead")}
            </p>
          </div>
          <Button asChild variant="ghost" className="text-primary h-auto shrink-0 self-start px-0 font-semibold hover:bg-transparent">
            <Link href={moreHref} className="inline-flex items-center gap-0.5">
              {t("recommendedGuardiansViewAll")}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {picks.map((g) => {
            const rep = repBlock(g, locale);
            return (
              <article
                key={g.user_id}
                className="border-border/60 bg-card flex flex-col rounded-2xl border p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex gap-4">
                  <div className="border-border/50 relative size-[4.5rem] shrink-0 overflow-hidden rounded-full border bg-muted">
                    {g.photo_url ? (
                      <Image src={g.photo_url} alt="" fill className="object-cover" sizes="72px" />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center text-lg font-semibold">
                        {g.display_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-foreground truncate font-semibold">{g.display_name}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug">{g.headline}</p>
                      </div>
                      <Badge variant={guardianTierBadgeVariant(g.guardian_tier)} className="shrink-0 text-[10px]">
                        {tierLabel(g.guardian_tier)}
                      </Badge>
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
                        <p className="text-primary text-[10px] font-bold tracking-widest uppercase">
                          {postHasRouteJourney(rep.post) ? t("recommendedSpotRouteLabel") : t("recommendedSpotPostLabel")}
                        </p>
                        <Link
                          href={`/posts/${rep.post.id}`}
                          className="text-foreground mt-1 block text-sm font-medium leading-snug hover:text-primary"
                        >
                          {rep.post.title}
                        </Link>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{rep.post.summary}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-primary flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase">
                          <MapPin className="size-3" aria-hidden />
                          {t("recommendedSpotRouteLabel")}
                        </p>
                        <p className="text-foreground mt-1 text-sm font-medium leading-snug">{rep.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{rep.blurb}</p>
                      </>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 flex-1" />
                <Button asChild className="w-full rounded-xl font-semibold">
                  <Link href={`/guardians/${g.user_id}`}>{t("recommendedGuardianCardCta")}</Link>
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg" className="rounded-2xl border-2 px-8 font-semibold">
            <Link href={moreHref}>{t("recommendedGuardiansMoreCta")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
