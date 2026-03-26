"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockContentPosts } from "@/data/mock";
import { isActiveLaunchArea, listPublicGuardians, type PublicGuardian } from "@/lib/guardian-public";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgeRow } from "@/components/forty-two/trust-badges";
import { guardianProfileImageUrls, GUARDIAN_PROFILE_COVER_POSITION_CLASS } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { SaveGuardianButton } from "@/components/guardians/save-guardian-button";
import { ExplorationFilterSummaryBar, type ExplorationSummaryChip } from "@/components/listing/exploration-filter-summary-bar";
import { StickyListingFiltersBar } from "@/components/listing/sticky-listing-filters-bar";
import { SubpageHero } from "@/components/layout/subpage-hero";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ArrowDownWideNarrow,
  MapPin,
  Palette,
  SlidersHorizontal,
  ShieldCheck,
  Star,
  Languages,
  UserCircle,
} from "lucide-react";

type SortMode = "recommended" | "rating" | "reviews" | "fast";

const LANGS = ["en", "ko", "ja", "es"] as const;
const THEMES = ["k_drama_romance", "k_pop_day", "seoul_night", "movie_location", "safe_solo", "photo_route"] as const;
const STYLES = ["calm", "planner", "energetic", "trendy", "friendly", "flexible"] as const;

function repPostFor(g: PublicGuardian) {
  const id = g.representative_post_ids[0];
  if (!id) return null;
  return mockContentPosts.find((p) => p.id === id) ?? null;
}

export function GuardiansDiscoverClient() {
  const t = useTranslations("GuardiansDiscover");
  const tExplore = useTranslations("ListingExploration");
  const tLaunch = useTranslations("LaunchAreas");
  const tThemes = useTranslations("ExperienceThemes");
  const tStyles = useTranslations("CompanionStyles");
  const tTier = useTranslations("GuardianTier");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [region, setRegion] = useState<LaunchAreaSlug | "all" | "">("");
  const [language, setLanguage] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [style, setStyle] = useState<string>("");
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("recommended");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [desktopFilterDrawer, setDesktopFilterDrawer] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const apply = () => setDesktopFilterDrawer(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const all = listPublicGuardians();

  const filtered = useMemo(() => {
    let g = [...all];
    if (region && region !== "all") {
      g = g.filter((x) => x.launch_area_slug === region);
    } else if (region !== "all") {
      g = g.filter((x) => isActiveLaunchArea(x.launch_area_slug));
    }
    if (language) {
      g = g.filter((x) => x.languages.some((l) => l.language_code === language));
    }
    if (theme) {
      g = g.filter((x) => x.theme_slugs.includes(theme));
    }
    if (style) {
      g = g.filter((x) => x.companion_style_slugs.includes(style));
    }
    if (minRating > 0) {
      g = g.filter((x) => (x.avg_traveler_rating ?? 0) >= minRating);
    }
    if (verifiedOnly) {
      g = g.filter((x) => x.guardian_tier === "verified_guardian");
    }
    if (sort === "rating") {
      g.sort((a, b) => (b.avg_traveler_rating ?? 0) - (a.avg_traveler_rating ?? 0));
    } else if (sort === "reviews") {
      g.sort((a, b) => b.review_count_display - a.review_count_display);
    } else if (sort === "fast") {
      g.sort((a, b) => {
        const af = a.trust_badge_ids.includes("fast_response");
        const bf = b.trust_badge_ids.includes("fast_response");
        if (af !== bf) return af ? -1 : 1;
        return (b.avg_traveler_rating ?? 0) - (a.avg_traveler_rating ?? 0);
      });
    } else {
      g.sort((a, b) => {
        const vf = (x: PublicGuardian) => (x.matching_enabled ? 2 : 0) + (x.featured ? 1 : 0);
        return vf(b) - vf(a) || (b.avg_traveler_rating ?? 0) - (a.avg_traveler_rating ?? 0);
      });
    }
    return g;
  }, [all, region, language, theme, style, minRating, verifiedOnly, sort]);

  const summaryChips = useMemo((): ExplorationSummaryChip[] => {
    const chips: ExplorationSummaryChip[] = [];
    if (region === "all") {
      chips.push({
        id: "region-all",
        label: t("chipAllRegions"),
        onClear: () => setRegion(""),
      });
    } else if (region !== "") {
      const name = (tLaunch.raw(region) as { name: string }).name;
      chips.push({
        id: "region",
        label: t("chipRegion", { name }),
        onClear: () => setRegion(""),
      });
    }
    if (language) {
      chips.push({
        id: "lang",
        label: t("chipLanguage", { code: language.toUpperCase() }),
        onClear: () => setLanguage(""),
      });
    }
    if (theme) {
      const title = (tThemes.raw(theme) as { title: string }).title;
      chips.push({
        id: "theme",
        label: t("chipTheme", { name: title }),
        onClear: () => setTheme(""),
      });
    }
    if (style) {
      chips.push({
        id: "style",
        label: t("chipStyle", { name: tStyles(style) }),
        onClear: () => setStyle(""),
      });
    }
    if (minRating > 0) {
      chips.push({
        id: "rating",
        label: t("chipRating", { rating: minRating }),
        onClear: () => setMinRating(0),
      });
    }
    if (verifiedOnly) {
      chips.push({
        id: "verified",
        label: t("chipVerifiedShort"),
        onClear: () => setVerifiedOnly(false),
      });
    }
    if (sort !== "recommended") {
      const sortLabel =
        sort === "rating"
          ? t("sortRating")
          : sort === "reviews"
            ? t("sortReviews")
            : t("sortFast");
      chips.push({
        id: "sort",
        label: t("chipSort", { name: sortLabel }),
        onClear: () => setSort("recommended"),
      });
    }
    return chips;
  }, [region, language, theme, style, minRating, verifiedOnly, sort, t, tLaunch, tThemes, tStyles]);

  function pos(g: PublicGuardian) {
    return isKo ? g.positioning.ko : g.positioning.en;
  }

  const isFilterDefault =
    region === "" && !language && !theme && !style && minRating === 0 && !verifiedOnly && sort === "recommended";
  const hasActiveFilters = !isFilterDefault;

  function clearFilters() {
    setRegion("");
    setLanguage("");
    setTheme("");
    setStyle("");
    setMinRating(0);
    setVerifiedOnly(false);
    setSort("recommended");
    setFilterSheetOpen(false);
  }

  const filterPanel = (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm font-medium tabular-nums">{t("listResultsCount", { count: filtered.length })}</p>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 text-xs font-semibold sm:text-sm" onClick={clearFilters}>
            {t("clear")}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase sm:mb-3 sm:text-xs">
            <MapPin className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("filterRegion")}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              size="sm"
              variant={region === "" ? "default" : "outline"}
              className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
              onClick={() => setRegion((p) => (p === "" ? "all" : ""))}
            >
              {t("filterLaunchAreas")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={region === "all" ? "default" : "outline"}
              className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
              onClick={() => setRegion((p) => (p === "all" ? "" : "all"))}
            >
              {t("all")}
            </Button>
            {(["gwanghwamun", "gangnam", "busan", "jeju"] as const).map((slug) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={region === slug ? "default" : "outline"}
                className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
                onClick={() => setRegion((p) => (p === slug ? "" : slug))}
              >
                {(tLaunch.raw(slug) as { name: string }).name}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase sm:mb-3 sm:text-xs">
            <Languages className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("filterLanguage")}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            <Button type="button" size="sm" variant={language === "" ? "default" : "outline"} className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm" onClick={() => setLanguage("")}>
              {t("all")}
            </Button>
            {LANGS.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={language === code ? "default" : "outline"}
                className="shrink-0 rounded-full px-3.5 text-xs uppercase sm:text-sm"
                onClick={() => setLanguage((p) => (p === code ? "" : code))}
              >
                {code}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase sm:mb-3 sm:text-xs">
            <ArrowDownWideNarrow className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("sort")}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {(["recommended", "rating", "reviews", "fast"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={sort === m ? "default" : "outline"}
                className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
                onClick={() => setSort((prev) => (prev === m && m !== "recommended" ? "recommended" : m))}
              >
                {m === "recommended"
                  ? t("sortRecommended")
                  : m === "rating"
                    ? t("sortRating")
                    : m === "reviews"
                      ? t("sortReviews")
                      : t("sortFast")}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide sm:mb-3 sm:text-xs">
            <Palette className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("filterTheme")}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            <Button type="button" size="sm" variant={theme === "" ? "default" : "outline"} className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm" onClick={() => setTheme("")}>
              {t("all")}
            </Button>
            {THEMES.map((slug) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={theme === slug ? "default" : "outline"}
                className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
                onClick={() => setTheme((p) => (p === slug ? "" : slug))}
              >
                {(tThemes.raw(slug) as { title: string }).title}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide sm:mb-3 sm:text-xs">
            <UserCircle className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("filterStyle")}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            <Button type="button" size="sm" variant={style === "" ? "default" : "outline"} className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm" onClick={() => setStyle("")}>
              {t("all")}
            </Button>
            {STYLES.map((slug) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={style === slug ? "default" : "outline"}
                className="shrink-0 rounded-full px-3.5 text-xs sm:text-sm"
                onClick={() => setStyle((p) => (p === slug ? "" : slug))}
              >
                {tStyles(slug)}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-w-0 md:col-span-2 lg:col-span-3">
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide sm:mb-3 sm:text-xs">
            <Star className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
            {t("filterRating")}
          </p>
          <div className="-mx-1 flex flex-wrap gap-1.5">
            {[0, 4, 4.5].map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={minRating === r ? "default" : "outline"}
                className="rounded-full px-3.5 text-xs sm:text-sm"
                onClick={() => setMinRating((p) => (p === r ? 0 : r))}
              >
                {r === 0 ? t("all") : `${r}+`}
              </Button>
            ))}
          </div>
          <label className="text-foreground mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] py-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-primary size-5 shrink-0 rounded border-border"
            />
            <ShieldCheck className="text-[var(--brand-trust-blue)] size-4 shrink-0" aria-hidden />
            {t("filterVerified")}
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--bg-page)]">
      <SubpageHero title={t("heroTitle")} description={t("heroBody")} />

      <StickyListingFiltersBar innerClassName="py-2 sm:py-2.5">
        <ExplorationFilterSummaryBar
          chips={summaryChips}
          allExploringLabel={t("explorationAll")}
          resultSummary={t("listResultsCount", { count: filtered.length })}
          resultSummaryShort={String(filtered.length)}
          showReset={hasActiveFilters}
          resetLabel={t("clear")}
          onReset={clearFilters}
          openFiltersLabel={t("openFullFilters")}
          onOpenFilters={() => setFilterSheetOpen(true)}
          summaryAriaLabel={t("explorationSummaryAria")}
          chipClearLabel={(label) => tExplore("chipRemoveAria", { label })}
        />
      </StickyListingFiltersBar>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side={desktopFilterDrawer ? "right" : "bottom"}
          showCloseButton
          className={
            desktopFilterDrawer
              ? "h-dvh w-full max-w-[34rem] gap-0 overflow-hidden px-0 pt-2 pb-0 sm:max-w-[36rem]"
              : "max-h-[min(92dvh,720px)] gap-0 overflow-hidden rounded-t-2xl px-0 pt-2 pb-6 sm:max-h-[min(85dvh,800px)]"
          }
        >
          <SheetHeader className="border-border/60 shrink-0 border-b px-5 pb-4 text-left sm:px-6">
            <SheetTitle>{t("filterSheetTitle")}</SheetTitle>
            <p className="text-muted-foreground text-sm tabular-nums">{t("listResultsCount", { count: filtered.length })}</p>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <div className="border-border/60 mb-4 flex items-center gap-3 border-b pb-4 md:hidden">
              <span className="text-[var(--brand-trust-blue)] flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-trust-blue-soft)]">
                <SlidersHorizontal className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="text-text-strong text-base font-semibold">{t("filterTitle")}</h2>
            </div>
            {filterPanel}
          </div>
          <SheetFooter className="border-border/60 shrink-0 border-t px-5 py-3 sm:px-6">
            <div className="flex w-full items-center justify-end gap-2">
              <Button type="button" variant="ghost" className="h-10" onClick={clearFilters}>
                {t("clear")}
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={() => setFilterSheetOpen(false)}>
                {t("filterClose")}
              </Button>
              <Button type="button" className="h-10" onClick={() => setFilterSheetOpen(false)}>
                {t("filterApply")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="w-full px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 xl:px-10">
        {filtered.length === 0 ? (
          <div className="border-border/60 mx-auto max-w-lg rounded-[var(--radius-lg)] border border-dashed bg-muted/15 px-6 py-16 text-center sm:py-20">
            <span className="text-[var(--brand-trust-blue)] mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[var(--brand-trust-blue-soft)]">
              <UserCircle className="size-7" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-foreground text-base font-semibold">{t("empty")}</p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-[15px]">{t("emptyBody")}</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 2xl:gap-5">
            {filtered.map((g) => {
              const rep = repPostFor(g);
              const areaName = (tLaunch.raw(g.launch_area_slug) as { name: string }).name;
              const imgs = guardianProfileImageUrls(g);
              const styleSummary = g.companion_style_slugs
                .slice(0, 2)
                .map((slug) => tStyles(slug))
                .join(" · ");
              const expertiseSummary = g.expertise_tags.slice(0, 2).join(" · ");
              return (
                <li key={g.user_id}>
                  <Card className="border-border/70 h-full overflow-hidden rounded-[var(--radius-md)] py-0 shadow-[var(--shadow-sm)] transition-all hover:border-[color-mix(in_srgb,var(--brand-trust-blue)_30%,var(--border))] hover:shadow-[var(--shadow-md)]">
                    <div className="flex h-full">
                      <div className="relative w-[38%] min-w-[8.5rem] max-w-[10.5rem] self-stretch bg-muted/40 sm:min-w-[9rem]">
                        <Image src={imgs.default} alt="" fill className={GUARDIAN_PROFILE_COVER_POSITION_CLASS} sizes="(max-width:640px) 40vw, 20vw" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                      <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
                      <div>
                        <p className="text-foreground truncate text-[17px] font-semibold">{g.display_name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant={guardianTierBadgeVariant(g.guardian_tier)} className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}>
                            {tTier(g.guardian_tier)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">{pos(g)}</p>
                      </div>

                      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{areaName}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{g.languages.map((l) => l.language_code.toUpperCase()).join(" · ")}</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {styleSummary ? (
                          <p className="text-muted-foreground line-clamp-1">
                            <span className="text-foreground font-semibold">{t("filterStyle")}</span> · {styleSummary}
                          </p>
                        ) : null}
                        {expertiseSummary ? (
                          <p className="text-muted-foreground line-clamp-1">
                            <span className="text-foreground font-semibold">{t("filterTheme")}</span> · {expertiseSummary}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <TrustBadgeRow ids={g.trust_badge_ids} size="xs" />
                        {g.avg_traveler_rating != null ? (
                          <p className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                            {g.avg_traveler_rating.toFixed(1)}
                            <span className="text-muted-foreground text-xs font-normal">({g.review_count_display})</span>
                          </p>
                        ) : null}
                      </div>

                        {rep ? (
                          <div className="border-border/60 bg-muted/20 rounded-xl border p-2">
                          <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">{t("repPost")}</p>
                            <p className="text-foreground mt-1 line-clamp-1 text-sm font-medium leading-snug">{rep.title}</p>
                          </div>
                        ) : null}

                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <Button asChild className="h-9 w-full rounded-[var(--radius-md)] text-xs font-semibold sm:text-sm">
                            <Link href={`/guardians/${g.user_id}`}>{t("cardCtaPrimary")}</Link>
                          </Button>
                          <div className="[&_button]:h-9 [&_button]:w-full [&_button]:text-xs sm:[&_button]:text-sm">
                            <SaveGuardianButton guardianUserId={g.user_id} compact />
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <section className="border-border/60 from-card to-muted/20 mt-16 rounded-[var(--radius-lg)] border bg-gradient-to-br p-8 sm:mt-20 sm:p-10 md:p-12">
          <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("footerCtaTitle")}</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-[15px] leading-relaxed sm:text-base">{t("footerCtaBody")}</p>
          <Button asChild className="mt-8 rounded-[var(--radius-md)]">
            <Link href="/guardians/apply">{t("footerCtaButton")}</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
