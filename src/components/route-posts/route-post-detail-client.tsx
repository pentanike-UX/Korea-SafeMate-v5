"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentPost, RouteSpot } from "@/types/domain";
import { RouteMapPreview } from "@/components/maps/route-map-preview";
import { RouteStickyLocalNav } from "@/components/route-posts/route-sticky-local-nav";
import { RouteSummaryChips } from "@/components/route-posts/route-summary-chips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { postCoverImageUrl } from "@/lib/content-post-route";
import { cn } from "@/lib/utils";
import { ArrowRight, Calendar, Heart, MapPin } from "lucide-react";

function SpotDetailBody({ spot, isLast, onNext }: { spot: RouteSpot; isLast: boolean; onNext?: () => void }) {
  const t = useTranslations("RoutePosts");
  const img = spot.image_urls[0];

  return (
    <div className="space-y-4">
      {img ? (
        <div className="border-border/60 relative aspect-[16/10] overflow-hidden rounded-xl border">
          <Image src={img} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 640px" />
        </div>
      ) : null}
      <div>
        <p className="text-primary text-[10px] font-bold tracking-widest uppercase">{spot.place_name}</p>
        {spot.address_line ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{spot.address_line}</p>
        ) : null}
        <h3 className="text-text-strong mt-1 text-lg font-semibold">{spot.title}</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{spot.short_description}</p>
      </div>
      {spot.body ? (
        <div className="text-foreground space-y-2 text-sm leading-relaxed">
          {spot.body.split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : null}
      {spot.recommend_reason ? (
        <Card className="rounded-xl border-primary/15 bg-primary/5 shadow-none">
          <CardContent className="space-y-1 p-4">
            <p className="text-primary text-xs font-semibold">{t("whyRecommend")}</p>
            <p className="text-foreground text-sm leading-relaxed">{spot.recommend_reason}</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {spot.photo_tip ? (
          <div className="rounded-xl border border-border/60 bg-white/80 p-3 text-sm">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">{t("photoTip")}</p>
            <p className="text-foreground mt-1 leading-relaxed">{spot.photo_tip}</p>
          </div>
        ) : null}
        {spot.caution ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
            <p className="text-amber-800 text-[10px] font-bold tracking-wide uppercase dark:text-amber-200">{t("caution")}</p>
            <p className="text-foreground mt-1 leading-relaxed">{spot.caution}</p>
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("stayDuration", { minutes: spot.stay_duration_minutes })}
      </p>
      {!isLast && onNext ? (
        <Button type="button" variant="outline" className="w-full gap-2 rounded-xl" onClick={onNext}>
          {t("ctaNextSpot")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export function RoutePostDetailClient({ post }: { post: ContentPost }) {
  const t = useTranslations("RoutePosts");
  const tPosts = useTranslations("Posts");
  const journey = post.route_journey!;
  const meta = journey.metadata;
  const spots = useMemo(() => [...journey.spots].sort((a, b) => a.order - b.order), [journey.spots]);

  const mapCardRef = useRef<HTMLDivElement>(null);
  const spotsEndRef = useRef<HTMLDivElement>(null);

  const [activeSpotId, setActiveSpotId] = useState<string | null>(spots[0]?.id ?? null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showStickyNav, setShowStickyNav] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const fn = () => setIsMobile(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const navigateToSpotSection = useCallback((id: string) => {
    setActiveSpotId(id);
    document.getElementById(`route-spot-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 2200);
  }, []);

  const scrollToMainMap = useCallback(() => {
    mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /** Main hero map: mobile opens sheet; desktop scrolls to section. */
  function onMainMapSpotSelect(id: string) {
    setActiveSpotId(id);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      navigateToSpotSection(id);
    }
  }

  function goNextFrom(id: string) {
    const idx = spots.findIndex((s) => s.id === id);
    const next = spots[idx + 1];
    if (!next) return;
    navigateToSpotSection(next.id);
    if (isMobile) setSheetOpen(true);
  }

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const mapEl = mapCardRef.current;
      const endEl = spotsEndRef.current;
      if (!mapEl || !endEl) return;

      const mapBottom = mapEl.getBoundingClientRect().bottom;
      const endTop = endEl.getBoundingClientRect().top;
      const stickyOn = mapBottom < 0 && endTop > 0;
      setShowStickyNav((prev) => (prev === stickyOn ? prev : stickyOn));

      const headerH = window.innerWidth >= 640 ? 64 : 56;
      const stickyH = stickyOn ? (isMobile ? 48 : 56) : 0;
      const probeY = headerH + stickyH + 20;

      let nextActive: string | null = spots[0]?.id ?? null;
      for (const spot of spots) {
        const el = document.getElementById(`route-spot-${spot.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= probeY) nextActive = spot.id;
      }
      setActiveSpotId((prev) => (prev === nextActive ? prev : nextActive));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [spots, isMobile]);

  const selectedSpot = spots.find((s) => s.id === activeSpotId) ?? null;

  const cover = postCoverImageUrl(post);
  const date = new Date(post.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      {showStickyNav && spots.length > 0 ? (
        <RouteStickyLocalNav
          spots={spots}
          activeSpotId={activeSpotId}
          onSpotNavigate={(id) => navigateToSpotSection(id)}
          onScrollToMainMap={scrollToMainMap}
          isMobile={isMobile}
        />
      ) : null}

      <header className="relative overflow-hidden rounded-[1.75rem] border border-border/60 shadow-[var(--shadow-md)]">
        <div className="relative aspect-[21/11] max-h-[340px] min-h-[200px] sm:aspect-[3/1]">
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" sizes="100vw" priority />
          ) : (
            <div className="bg-muted absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b3d]/80 via-[#0e1b3d]/35 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 space-y-3 p-6 sm:p-10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full border-white/20 bg-white/15 font-medium text-white">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">{post.title}</h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">{post.summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" aria-hidden />
                {date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                <span className="capitalize">{tPosts(`region.${post.region_slug}` as "region.seoul")}</span>
              </span>
              {post.helpful_rating != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="size-4 fill-rose-300/90 text-rose-200" aria-hidden />
                  {tPosts("helpfulShort", { rating: post.helpful_rating.toFixed(1) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        <Card ref={mapCardRef} className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-[var(--shadow-md)]">
          <div className="border-border/50 flex items-center justify-between border-b bg-white/90 px-5 py-4">
            <div>
              <p className="text-primary text-[10px] font-bold tracking-widest uppercase">{t("routeEyebrow")}</p>
              <h2 className="text-text-strong text-lg font-semibold">{t("mapTitle")}</h2>
            </div>
            <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
              {spots.length} {t("stops")}
            </Badge>
          </div>
          <div className="relative aspect-[16/9] w-full bg-muted lg:aspect-[21/9]">
            <RouteMapPreview
              spots={journey.spots}
              path={journey.path}
              selectedSpotId={activeSpotId}
              onSpotSelect={onMainMapSpotSelect}
              className="h-full"
            />
          </div>
        </Card>

        <RouteSummaryChips meta={meta} tags={post.tags} spotCount={spots.length} />

        {post.route_highlights && post.route_highlights.length > 0 ? (
          <section className="rounded-2xl border border-border/60 bg-white/90 p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-text-strong text-lg font-semibold">{t("insightTitle")}</h2>
            <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed">
              {post.route_highlights.map((line) => (
                <li key={line} className="marker:text-primary">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {post.body ? (
          <div className="text-foreground space-y-3 text-[15px] leading-relaxed sm:text-base">
            {post.body.split("\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mt-12 space-y-6">
        <h2 className="text-text-strong text-lg font-semibold">{t("spotsTitle")}</h2>
        {spots.map((spot, index) => {
          const isLast = index === spots.length - 1;
          return (
            <article
              key={spot.id}
              id={`route-spot-${spot.id}`}
              className={cn(
                "rounded-2xl border border-border/60 bg-white/95 p-5 shadow-[var(--shadow-sm)] transition-[box-shadow] sm:p-7",
                showStickyNav ? "scroll-mt-36 sm:scroll-mt-40" : "scroll-mt-28",
                flashId === spot.id ? "ring-primary ring-2 ring-offset-2" : "",
                activeSpotId === spot.id && showStickyNav ? "border-primary/25" : "",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    activeSpotId === spot.id && showStickyNav
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/12 text-primary",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-text-strong text-xl font-semibold">{spot.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{spot.place_name}</p>
                  {spot.address_line ? (
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{spot.address_line}</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="link"
                    className="text-primary mt-2 h-auto p-0 text-sm font-semibold lg:hidden"
                    onClick={() => {
                      setActiveSpotId(spot.id);
                      setSheetOpen(true);
                    }}
                  >
                    {t("ctaViewSpot")}
                  </Button>
                </div>
              </div>
              <div className="mt-6">
                <SpotDetailBody spot={spot} isLast={isLast} onNext={isLast ? undefined : () => goNextFrom(spot.id)} />
              </div>
              {!isLast ? (
                <p className="text-primary mt-6 text-center text-xs font-semibold tracking-wide uppercase">{t("nextCue")}</p>
              ) : null}
            </article>
          );
        })}
      </section>

      <div ref={spotsEndRef} aria-hidden className="h-px w-full" />

      <div className="border-border/50 mt-12 rounded-2xl border bg-gradient-to-br from-[var(--brand-primary-soft)] to-white p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-text-strong text-lg font-semibold">{t("bottomCtaTitle")}</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">{t("bottomCtaLead")}</p>
        <Button asChild size="lg" className="mt-6 rounded-2xl px-10">
          <Link href={`/book?guardian=${post.author_user_id}`}>{t("ctaRequestGuardian")}</Link>
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl px-4 pt-2 pb-6" showCloseButton>
          {selectedSpot ? (
            <>
              <SheetHeader className="px-0 text-left">
                <SheetTitle className="text-left text-base">{selectedSpot.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 max-h-[calc(88vh-5rem)] overflow-y-auto pr-1">
                <SpotDetailBody
                  spot={selectedSpot}
                  isLast={selectedSpot.id === spots[spots.length - 1]?.id}
                  onNext={() => goNextFrom(selectedSpot.id)}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
