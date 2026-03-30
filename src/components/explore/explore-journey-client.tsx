"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mockContentPosts, mockExperienceThemes } from "@/data/mock";
import { listLaunchReadyGuardians, type PublicGuardian } from "@/lib/guardian-public";
import type { ContentPost } from "@/types/domain";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { isLaunchAreaSelectable } from "@/lib/launch-area-selectable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExploreJourneySummaryBar } from "@/components/explore/explore-journey-summary-bar";
import { ExploreRegionStep } from "@/components/explore/explore-region-step";
import { ExploreThemeStep } from "@/components/explore/explore-theme-step";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  companionSlugsForStyle,
  sceneMoodToTasteIds,
  type GuardianStyleId,
  type PartySize,
  type SceneMoodId,
  type TripWhenPreset,
} from "@/components/explore/explore-journey-data";
import {
  ExploreResultsDashboard,
  ExploreTasteBuilderStep,
  ExploreTripSetupStep,
} from "@/components/explore/explore-journey-step-panels";

const STEPS = 5;

type LangPref = "en" | "ko" | "ja" | "any";
type Pace = "calm" | "balanced" | "packed";

export function ExploreJourneyClient() {
  const t = useTranslations("ExploreJourney");
  const tG = useTranslations("GuardiansDiscover");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<LaunchAreaSlug | "">("");
  const [theme, setTheme] = useState<string>("");
  const [enteredExploreViaPreset, setEnteredExploreViaPreset] = useState(false);

  const [days, setDays] = useState<string>("1");
  const [langPref, setLangPref] = useState<LangPref>("any");
  const [pace, setPace] = useState<Pace>("balanced");
  const [tripWhenPreset, setTripWhenPreset] = useState<TripWhenPreset | null>(null);
  const [tripCustomDate, setTripCustomDate] = useState("");
  const [partySize, setPartySize] = useState<PartySize>("solo");

  const [workQuery, setWorkQuery] = useState("");
  const [workTokens, setWorkTokens] = useState<string[]>([]);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistTokens, setArtistTokens] = useState<string[]>([]);
  const [sceneMoods, setSceneMoods] = useState<SceneMoodId[]>([]);
  const [guardianStylePrefs, setGuardianStylePrefs] = useState<GuardianStyleId[]>([]);

  const [resultsSpin, setResultsSpin] = useState(0);

  useEffect(() => {
    const a = searchParams.get("area");
    const th = searchParams.get("theme");
    const validArea = Boolean(a && isLaunchAreaSelectable(a as LaunchAreaSlug));
    const validTheme = Boolean(th && mockExperienceThemes.some((x) => x.slug === th));

    if (validArea && a) setRegion(a as LaunchAreaSlug);
    if (validTheme && th) setTheme(th);

    if (validArea && validTheme) {
      setStep((prev) => (prev <= 1 ? 2 : prev));
      setEnteredExploreViaPreset(true);
    } else if (validArea) {
      setStep((prev) => (prev === 0 ? 1 : prev));
    }
  }, [searchParams]);

  const comingSoonArea = region === "busan" || region === "jeju";

  const effectiveTasteIds = useMemo(() => {
    const s = new Set<string>();
    sceneMoods.forEach((m) => sceneMoodToTasteIds(m).forEach((id) => s.add(id)));
    return [...s];
  }, [sceneMoods]);

  const results = useMemo(() => {
    if (!region || comingSoonArea) return { guardians: [] as PublicGuardian[], posts: [] as ContentPost[] };
    const pool = listLaunchReadyGuardians();
    let g = pool.filter((x) => x.launch_area_slug === region);
    if (theme) {
      g = g.filter((x) => x.theme_slugs.includes(theme));
    }
    if (langPref !== "any") {
      g = g.filter((x) => x.languages.some((l) => l.language_code === langPref));
    }
    if (pace === "calm") {
      g = g.filter((x) => x.companion_style_slugs.includes("calm") || x.companion_style_slugs.includes("friendly"));
    }
    if (pace === "packed") {
      g = g.filter((x) => x.companion_style_slugs.includes("energetic") || x.companion_style_slugs.includes("planner"));
    }
    if (guardianStylePrefs.length > 0) {
      const hasNoMatchStyle = guardianStylePrefs.includes("style_no_match_test");
      if (hasNoMatchStyle) {
        g = [];
      } else {
        g = g.filter((x) =>
          guardianStylePrefs.some((pref) =>
            companionSlugsForStyle(pref).some((slug) => x.companion_style_slugs.includes(slug)),
          ),
        );
      }
    }
    effectiveTasteIds.forEach((tid) => {
      if (tid === "tastePhoto") {
        g.sort((a, b) => (b.theme_slugs.includes("photo_route") ? 1 : 0) - (a.theme_slugs.includes("photo_route") ? 1 : 0));
      }
    });
    g = [...g].sort((a, b) => (b.avg_traveler_rating ?? 0) - (a.avg_traveler_rating ?? 0));
    if (g.length > 0 && resultsSpin > 0) {
      const rot = resultsSpin % g.length;
      g = [...g.slice(rot), ...g.slice(0, rot)];
    }

    const posts = mockContentPosts
      .filter((p) => p.status === "approved" && p.region_slug === "seoul")
      .filter((p) => {
        if (!theme) return true;
        if (theme === "k_pop_day") return p.tags.some((x) => /k-pop|album|pop/i.test(x));
        if (theme === "k_drama_romance") return p.tags.some((x) => /drama|filming|hanok|palace/i.test(x));
        if (theme === "movie_location") return p.category_slug === "k-content" || p.tags.some((x) => /film|filming/i.test(x));
        if (theme === "seoul_night") return p.tags.some((x) => /night|Hongdae|late/i.test(x));
        if (theme === "photo_route") return p.kind === "hot_place" || p.tags.some((x) => /photo|view/i.test(x));
        if (theme === "safe_solo") return p.kind === "practical" || p.kind === "local_tip";
        return true;
      })
      .slice(0, 8);

    return { guardians: g.slice(0, 6), posts };
  }, [region, theme, langPref, pace, comingSoonArea, resultsSpin, guardianStylePrefs, effectiveTasteIds]);

  function toggleSceneMood(id: SceneMoodId) {
    setSceneMoods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleGuardianStyle(id: GuardianStyleId) {
    setGuardianStylePrefs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addWorkToken(w: string) {
    const t0 = w.trim();
    if (!t0 || workTokens.includes(t0)) return;
    setWorkTokens((prev) => [...prev, t0]);
  }

  function removeWorkToken(w: string) {
    setWorkTokens((prev) => prev.filter((x) => x !== w));
  }

  function addArtistToken(w: string) {
    const t0 = w.trim();
    if (!t0 || artistTokens.includes(t0)) return;
    setArtistTokens((prev) => [...prev, t0]);
  }

  function removeArtistToken(w: string) {
    setArtistTokens((prev) => prev.filter((x) => x !== w));
  }

  const showMobileStickyCta = step === 2 || step === 3;

  return (
    <div className="bg-[var(--bg-page)] min-h-[70vh]">
      <section className="border-border/60 border-b bg-card/95">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="text-primary inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            42 Guardians
          </p>
          <h1 className="text-text-strong mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("heroTitle")}</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-[15px]">{t("heroBody")}</p>
        </div>
      </section>

      <div
        id="journey-steps"
        className={cn(
          "mx-auto scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10",
          step === 4 ? "max-w-5xl" : "max-w-3xl",
          showMobileStickyCta && "pb-28 sm:pb-10",
        )}
      >
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (i === 4 && step !== 4) return;
                if (i < 4) setStep(i);
              }}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                  : i < step
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </button>
          ))}
        </div>

        {enteredExploreViaPreset && step >= 2 && region && theme ? (
          <p className="text-muted-foreground mb-2 text-center text-[11px] font-medium">{t("presetFromHome")}</p>
        ) : null}

        <ExploreJourneySummaryBar
          step={step}
          region={region}
          theme={theme}
          days={days}
          partySize={partySize}
          pace={pace}
          langPref={langPref}
          tripWhenPreset={tripWhenPreset}
          sceneMoods={sceneMoods}
          guardianStylePrefs={guardianStylePrefs}
          workTokens={workTokens}
          artistTokens={artistTokens}
          onEditBasics={step >= 2 ? () => setStep(0) : undefined}
        />

        {step === 0 ? <ExploreRegionStep value={region} onChange={(slug) => setRegion(slug)} /> : null}

        {step === 1 ? <ExploreThemeStep value={theme} onChange={setTheme} /> : null}

        {step === 2 ? (
          <ExploreTripSetupStep
            days={days}
            setDays={setDays}
            tripWhenPreset={tripWhenPreset}
            setTripWhenPreset={setTripWhenPreset}
            tripCustomDate={tripCustomDate}
            setTripCustomDate={setTripCustomDate}
            partySize={partySize}
            setPartySize={setPartySize}
            pace={pace}
            setPace={setPace}
            langPref={langPref}
            setLangPref={setLangPref}
          />
        ) : null}

        {step === 3 ? (
          <ExploreTasteBuilderStep
            workQuery={workQuery}
            setWorkQuery={setWorkQuery}
            workTokens={workTokens}
            addWorkToken={addWorkToken}
            removeWorkToken={removeWorkToken}
            artistQuery={artistQuery}
            setArtistQuery={setArtistQuery}
            artistTokens={artistTokens}
            addArtistToken={addArtistToken}
            removeArtistToken={removeArtistToken}
            sceneMoods={sceneMoods}
            toggleSceneMood={toggleSceneMood}
            guardianStylePrefs={guardianStylePrefs}
            toggleGuardianStyle={toggleGuardianStyle}
            locale={locale}
          />
        ) : null}

        {step === 4 ? (
          <ExploreResultsDashboard
            comingSoonArea={comingSoonArea}
            results={results}
            region={region}
            theme={theme}
            days={days}
            partySize={partySize}
            pace={pace}
            langPref={langPref}
            tripWhenPreset={tripWhenPreset}
            tripCustomDate={tripCustomDate}
            workTokens={workTokens}
            artistTokens={artistTokens}
            sceneMoods={sceneMoods}
            guardianStylePrefs={guardianStylePrefs}
            onEditConditions={() => setStep(0)}
            onReRecommend={() => setResultsSpin((x) => x + 1)}
            resultsSpinDisabled={results.guardians.length === 0}
          />
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-8">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {step >= 1 && step <= 3 ? (
              <Button type="button" variant="ghost" className="rounded-xl max-sm:hidden" onClick={() => setStep((s) => s + 1)}>
                {t("skipStep")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl max-sm:hidden"
              onClick={() => {
                setEnteredExploreViaPreset(false);
                setStep(0);
              }}
            >
              {t("reset")}
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                className="rounded-xl max-sm:hidden"
                disabled={
                  (step === 0 && !isLaunchAreaSelectable(region)) || (step === 1 && !theme)
                }
                onClick={() => setStep((s) => s + 1)}
              >
                {t("next")}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
            {step === 3 ? (
              <Button type="button" className="rounded-xl max-sm:hidden" onClick={() => setStep(4)}>
                {t("seeResults")}
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">{tG("launchOnlyNote")}</p>
      </div>

      {showMobileStickyCta ? (
        <div className="border-border/60 fixed right-0 bottom-0 left-0 z-40 border-t bg-background/92 backdrop-blur-md sm:hidden">
          <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              {t("back")}
            </Button>
            {step === 2 ? (
              <Button type="button" className="flex-[2] rounded-xl shadow-[var(--shadow-brand)]" onClick={() => setStep(3)}>
                {t("next")}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" className="flex-[2] rounded-xl shadow-[var(--shadow-brand)]" onClick={() => setStep(4)}>
                {t("seeResults")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
