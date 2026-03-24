"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockExperienceThemes, mockLaunchAreas } from "@/data/mock";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHomeExplorePreferences } from "@/components/home/home-explore-preferences";
import { cn } from "@/lib/utils";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";

type MoodSlug = (typeof mockExperienceThemes)[number]["slug"];

const REGION_DESC_KEY: Record<LaunchAreaSlug, "regionDesc_gwanghwamun" | "regionDesc_gangnam" | "regionDesc_busan" | "regionDesc_jeju"> = {
  gwanghwamun: "regionDesc_gwanghwamun",
  gangnam: "regionDesc_gangnam",
  busan: "regionDesc_busan",
  jeju: "regionDesc_jeju",
};

function moodDescI18nKey(slug: string) {
  return `moodDesc_${slug}` as
    | "moodDesc_k_drama_romance"
    | "moodDesc_seoul_night"
    | "moodDesc_k_pop_day"
    | "moodDesc_movie_location"
    | "moodDesc_safe_solo"
    | "moodDesc_photo_route";
}

export function HomeQuickStartExplorer() {
  const t = useTranslations("HomeQuickStart");
  const tHome = useTranslations("Home");
  const tLaunch = useTranslations("LaunchAreas");
  const tTheme = useTranslations("ExperienceThemes");
  const { area, theme, setArea, setTheme } = useHomeExplorePreferences();

  const exploreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (area) p.set("area", area);
    if (theme) p.set("theme", theme);
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore#journey-steps";
  }, [area, theme]);

  const canExplore = area !== null || theme !== null;

  function regionLabel(slug: LaunchAreaSlug) {
    return (tLaunch.raw(slug) as { name: string }).name;
  }

  function themeTitle(slug: MoodSlug) {
    const raw = tTheme.raw(slug) as { title: string };
    return raw.title;
  }

  return (
    <section className="border-border/40 border-b bg-[#f7f8fb]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="mb-10 max-w-2xl">
          <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">{t("eyebrow")}</p>
          <h2 className="text-text-strong mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-[15px]">{t("lead")}</p>
        </div>

        {/* 1. Regions */}
        <div className="mb-12">
          <h3 className="text-foreground mb-4 text-sm font-semibold tracking-tight sm:text-base">{t("step1Title")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mockLaunchAreas.map((a) => {
              const active = a.active && !a.comingSoon;
              const selected = area === a.slug;
              const copy = tLaunch.raw(a.slug) as { name: string; blurb: string; landmark: string; imageAlt: string };
              const desc = t(REGION_DESC_KEY[a.slug]);

              return (
                <button
                  key={a.slug}
                  type="button"
                  disabled={!active}
                  onClick={() => {
                    if (!active) return;
                    setArea(area === a.slug ? null : a.slug);
                  }}
                  className={cn(
                    "group border-border/70 bg-card text-left transition-all",
                    "relative flex flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)]",
                    active && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                    !active && "cursor-not-allowed opacity-[0.58]",
                    selected && active && "ring-primary ring-[3px] ring-offset-2 ring-offset-[#f7f8fb]",
                  )}
                >
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={a.imageUrl}
                      alt={copy.imageAlt}
                      fill
                      className={cn("object-cover transition duration-500", active && "group-hover:scale-[1.02]")}
                      sizes="(max-width:640px) 100vw, 25vw"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent",
                        selected && active && "from-black/75",
                      )}
                    />
                    <div className="absolute top-2.5 right-2.5 flex gap-1">
                      {!active ? (
                        <Badge variant="secondary" className="bg-white/95 text-[10px] font-semibold text-foreground">
                          {tHome("launchBadgeSoon")}
                        </Badge>
                      ) : selected ? (
                        <Badge className="bg-white/95 text-[10px] font-semibold text-[var(--brand-primary)]">
                          {t("selected")}
                        </Badge>
                      ) : (
                        <Badge className="bg-[var(--success)] text-[10px] font-semibold text-white hover:bg-[var(--success)]">
                          {tHome("launchBadgeLive")}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute right-3 bottom-3 left-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-tight text-balance text-white drop-shadow-md">
                        {copy.landmark}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-primary size-4 shrink-0" aria-hidden />
                      <span className="text-foreground font-semibold">{copy.name}</span>
                    </div>
                    <p className="text-muted-foreground mt-2 flex-1 text-[13px] leading-relaxed">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Moods */}
        <div className="mb-12">
          <h3 className="text-foreground mb-4 text-sm font-semibold tracking-tight sm:text-base">{t("step2Title")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockExperienceThemes.map((th) => {
              const selected = theme === th.slug;
              const title = themeTitle(th.slug as MoodSlug);
              const desc = t(moodDescI18nKey(th.slug));

              return (
                <button
                  key={th.slug}
                  type="button"
                  onClick={() => setTheme(theme === th.slug ? null : th.slug)}
                  className={cn(
                    "border-border/70 bg-card rounded-2xl border p-5 text-left shadow-[var(--shadow-sm)] transition-all",
                    "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                    selected && "ring-primary ring-[3px] ring-offset-2 ring-offset-[#f7f8fb]",
                  )}
                >
                  <div className="mb-3 h-1.5 w-full rounded-full" style={{ background: th.gradient }} />
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-foreground font-semibold leading-snug">{title}</h4>
                    {selected ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
                        {t("selected")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary + CTA */}
        <div className="border-border/60 bg-card rounded-[1.35rem] border p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
                <Sparkles className="text-primary size-3.5" aria-hidden />
                {t("summaryTitle")}
              </p>
              <div className="mt-3 flex min-h-[2.5rem] flex-wrap gap-2">
                {!area && !theme ? (
                  <span className="text-muted-foreground text-sm">{t("summaryEmpty")}</span>
                ) : (
                  <>
                    {area ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-sm font-medium"
                      >
                        {regionLabel(area)}
                      </Badge>
                    ) : null}
                    {theme ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-sm font-medium"
                      >
                        {themeTitle(theme as MoodSlug)}
                      </Badge>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto sm:flex-wrap">
              {canExplore ? (
                <Button asChild size="lg" className="rounded-2xl px-7 font-semibold shadow-[var(--shadow-brand)]">
                  <Link href={exploreHref} className="gap-2">
                    {t("ctaGuardians")}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button type="button" size="lg" disabled className="rounded-2xl px-7 font-semibold">
                  {t("ctaGuardians")}
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-2 px-7 font-semibold">
                <Link href="/posts?content=route">{t("ctaPosts")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
