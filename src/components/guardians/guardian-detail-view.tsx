import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { mockContentPosts, mockTravelerReviews, mockTravelerReviewQuotes } from "@/data/mock";
import { getContentPostFormat, postHasRouteJourney } from "@/lib/content-post-route";
import { isActiveLaunchArea, type PublicGuardian } from "@/lib/guardian-public";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgesServer } from "@/components/forty-two/trust-badges-server";
import { GuardianStickyCta } from "@/components/guardians/guardian-sticky-cta";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { cn } from "@/lib/utils";
import { ArrowLeft, Star } from "lucide-react";

export async function GuardianDetailView({ guardian: g }: { guardian: PublicGuardian }) {
  const t = await getTranslations("GuardianDetail");
  const tLaunch = await getTranslations("LaunchAreas");
  const tTier = await getTranslations("GuardianTier");
  const locale = await getLocale();
  const isKo = locale === "ko";

  const areaLive = isActiveLaunchArea(g.launch_area_slug);
  const intro = isKo ? g.intro.ko : g.intro.en;
  const posts = g.representative_post_ids
    .map((id) => mockContentPosts.find((p) => p.id === id))
    .filter(Boolean) as (typeof mockContentPosts)[0][];

  const reviews = mockTravelerReviews.filter((r) => r.guardian_user_id === g.user_id);
  const areaName = (tLaunch.raw(g.launch_area_slug) as { name: string }).name;

  const requestBase = `/book?guardian=${g.user_id}`;
  const imgs = guardianProfileImageUrls(g);

  return (
    <div className="bg-[var(--bg-page)] pb-28 md:pb-12">
      {!areaLive ? (
        <div className="border-b border-amber-500/25 bg-amber-500/10">
          <p className="text-foreground mx-auto max-w-6xl px-4 py-3 text-center text-sm sm:px-6">{t("areaSoon")}</p>
        </div>
      ) : null}

      <div className="relative">
        <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Link
            href="/guardians"
            className="group/back text-muted-foreground hover:text-foreground mb-4 -ml-2 inline-flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium transition-all duration-200 hover:border-border/70 hover:gap-2"
          >
            <ArrowLeft className="size-4 shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5" aria-hidden />
            {t("backToList")}
          </Link>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-border/60 relative aspect-[21/9] overflow-hidden rounded-[1.75rem] border bg-muted shadow-[var(--shadow-md)] sm:aspect-[3/1]">
            <Image src={imgs.landscape} alt="" fill className="object-cover object-center" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b3d]/85 via-[#0e1b3d]/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-10">
              <div>
                <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                  <div className="border-background/40 relative size-14 shrink-0 overflow-hidden rounded-full border-2 shadow-md sm:size-[4.25rem]">
                    <Image src={imgs.avatar} alt="" fill className="object-cover" sizes="72px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{g.display_name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={guardianTierBadgeVariant(g.guardian_tier)}
                        className={cn(
                          GUARDIAN_TIER_ROLE_BADGE_CLASSNAME,
                          "border-white/25 bg-white/15 text-white backdrop-blur-sm",
                        )}
                      >
                        {tTier(g.guardian_tier)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:mt-2 sm:text-base">
                  {isKo ? g.positioning.ko : g.positioning.en}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75 sm:mt-3">
                  <span>{areaName}</span>
                  <span aria-hidden>·</span>
                  <span>{g.languages.map((l) => l.language_code.toUpperCase()).join(" · ")}</span>
                  {g.avg_traveler_rating != null ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-300 text-amber-300" aria-hidden />
                        {g.avg_traveler_rating.toFixed(1)} ({g.review_count_display})
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="hidden shrink-0 flex-col gap-2 sm:flex sm:w-56">
                <Button asChild size="lg" className="rounded-2xl shadow-lg">
                  <Link href={requestBase}>{t("ctaPrimary")}</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="rounded-2xl bg-white/95 text-[var(--brand-primary)]">
                  <Link href={`${requestBase}&type=half`}>{t("ctaHalfDay")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-10 lg:col-span-7">
          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("introTitle")}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-[15px]">{intro}</p>
            <p className="text-muted-foreground mt-2 text-sm">{isKo ? g.response_note.ko : g.response_note.en}</p>
          </section>

          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("expertiseTitle")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.expertise_tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary/8 text-primary rounded-full px-3 py-1 text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("trustTitle")}</h2>
            <div className="mt-4">
              <TrustBadgesServer ids={g.trust_badge_ids} />
            </div>
          </section>

          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("postsTitle")}</h2>
            {posts.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">{t("noPosts")}</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {posts.map((p) => {
                  const fmt = getContentPostFormat(p);
                  const route = postHasRouteJourney(p);
                  const fmtLabel =
                    fmt === "hybrid"
                      ? t("postFormatHybrid")
                      : fmt === "route"
                        ? t("postFormatRoute")
                        : fmt === "spot"
                          ? t("postFormatSpot")
                          : t("postFormatArticle");
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/posts/${p.id}`}
                        className="border-border/70 bg-card block h-full rounded-2xl border p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-primary/25"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                            {fmtLabel}
                          </span>
                          {route ? (
                            <span className="text-muted-foreground text-[10px] font-medium">
                              {t("stopsLabel", { count: p.route_journey!.spots.length })}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-foreground mt-2 font-semibold leading-snug">{p.title}</p>
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{p.summary}</p>
                        <span className="text-primary mt-3 inline-block text-xs font-semibold">{t("readPost")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("routesTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {g.recommended_routes.map((r, i) => (
                <li key={i}>
                  <Card className="border-border/60 rounded-2xl border bg-card/90 shadow-none">
                    <CardContent className="p-4 sm:p-5">
                      <p className="font-semibold">{isKo ? r.title.ko : r.title.en}</p>
                      <p className="text-muted-foreground mt-2 text-sm">{isKo ? r.blurb.ko : r.blurb.en}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-text-strong text-lg font-semibold">{t("reviewsTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("reviewSample")}</p>
            <div className="mt-4 space-y-3">
              {reviews.map((r) => {
                const q = mockTravelerReviewQuotes[r.id];
                const text = q ? (isKo ? q.ko : q.en) : r.comment ?? "";
                return (
                  <Card key={r.id} className="rounded-2xl border-border/60">
                    <CardContent className="p-5">
                      <div className="flex gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={i < r.rating ? "size-4 fill-current" : "size-4"} aria-hidden />
                        ))}
                      </div>
                      <p className="text-foreground mt-3 text-sm leading-relaxed">&ldquo;{text}&rdquo;</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-5">
          <div className="border-border/60 bg-card lg:sticky lg:top-24 space-y-4 rounded-2xl border p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-text-strong text-lg font-semibold">{t("requestTitle")}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isKo
                ? "일정과 무드를 알려 주시면 팀이 검토 후 연결을 도와드립니다."
                : "Share timing and mood — we review and help with handoff."}
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild size="lg" className="w-full rounded-2xl">
                <Link href={requestBase}>{t("ctaPrimary")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-2xl">
                <Link href={`${requestBase}&type=half`}>{t("ctaHalfDay")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-2xl">
                <Link href={`${requestBase}&type=full`}>{t("ctaFullTrip")}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full rounded-2xl">
                <Link href={`${requestBase}&theme=1`}>{t("ctaTheme")}</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <GuardianStickyCta requestHref={requestBase} />
    </div>
  );
}
