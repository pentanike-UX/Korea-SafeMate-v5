"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { postCoverImageUrl, postHasRouteJourney } from "@/lib/content-post-route";
import type { PublicGuardian } from "@/lib/guardian-public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrustBadgeRow } from "@/components/forty-two/trust-badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Coffee,
  Compass,
  Heart,
  Landmark,
  Languages,
  MapPin,
  Moon,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
  Wind,
  Zap,
} from "lucide-react";
import {
  EXPLORE_ARTIST_SUGGESTIONS,
  EXPLORE_WORK_SUGGESTIONS,
  GUARDIAN_STYLE_IDS,
  SCENE_MOOD_IDS,
  type GuardianStyleId,
  type PartySize,
  type SceneMoodId,
  type TripWhenPreset,
} from "./explore-journey-data";

type LangPref = "en" | "ko" | "ja" | "any";
type Pace = "calm" | "balanced" | "packed";

function selectCardClass(selected: boolean) {
  return cn(
    "rounded-2xl border p-4 text-left transition-all",
    selected
      ? "border-primary bg-primary/8 ring-primary/25 shadow-[var(--shadow-sm)] ring-2"
      : "border-border/80 bg-card hover:border-primary/30 hover:shadow-[var(--shadow-sm)]",
  );
}

export function ExploreTripSetupStep({
  days,
  setDays,
  tripWhenPreset,
  setTripWhenPreset,
  tripCustomDate,
  setTripCustomDate,
  partySize,
  setPartySize,
  pace,
  setPace,
  langPref,
  setLangPref,
}: {
  days: string;
  setDays: (d: string) => void;
  tripWhenPreset: TripWhenPreset | null;
  setTripWhenPreset: (v: TripWhenPreset | null) => void;
  tripCustomDate: string;
  setTripCustomDate: (v: string) => void;
  partySize: PartySize;
  setPartySize: (v: PartySize) => void;
  pace: Pace;
  setPace: (v: Pace) => void;
  langPref: LangPref;
  setLangPref: (v: LangPref) => void;
}) {
  const t = useTranslations("ExploreJourney");
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  const whenOptions: { id: TripWhenPreset; icon: typeof CalendarDays }[] = [
    { id: "weekend", icon: CalendarDays },
    { id: "next_week", icon: CalendarDays },
    { id: "two_weeks", icon: CalendarDays },
    { id: "flex", icon: Compass },
  ];

  const partyOptions: { id: PartySize; icon: LucideIcon }[] = [
    { id: "solo", icon: UserRound },
    { id: "two", icon: Users },
    { id: "small", icon: UsersRound },
    { id: "group", icon: Users },
  ];

  const paceOptions: { id: Pace; icon: typeof Coffee }[] = [
    { id: "calm", icon: Coffee },
    { id: "balanced", icon: Sparkles },
    { id: "packed", icon: Zap },
  ];

  const langPrimary: { id: LangPref; flag: string }[] = [
    { id: "ko", flag: "KO" },
    { id: "en", flag: "EN" },
    { id: "ja", flag: "JA" },
    { id: "any", flag: "∞" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">{t("tripSetupEyebrow")}</p>
        <h2 className="text-text-strong mt-2 text-xl font-semibold sm:text-2xl">{t("tripSetupTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{t("tripSetupSubtitle")}</p>
      </div>

      <Card className="border-border/70 overflow-hidden rounded-[1.35rem] shadow-[var(--shadow-sm)]">
        <CardContent className="space-y-10 p-5 sm:p-8">
          {/* When */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <CalendarDays className="size-[18px]" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-foreground font-semibold">{t("tripWhenSection")}</h3>
                <p className="text-muted-foreground text-xs">{t("tripWhenHint")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {whenOptions.map(({ id, icon: Icon }) => {
                const selected = tripWhenPreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTripWhenPreset(selected ? null : id)}
                    className={selectCardClass(selected)}
                  >
                    <Icon className="text-muted-foreground mb-2 size-5" strokeWidth={1.5} />
                    <p className="text-foreground text-sm font-semibold">{t(`tripWhen_${id}` as "tripWhen_weekend")}</p>
                  </button>
                );
              })}
            </div>
            <div className="border-border/60 bg-muted/25 rounded-2xl border border-dashed p-4">
              <label htmlFor="explore-trip-date" className="text-muted-foreground text-xs font-medium">
                {t("tripDateOptional")}
              </label>
              <input
                id="explore-trip-date"
                type="date"
                value={tripCustomDate}
                onChange={(e) => setTripCustomDate(e.target.value)}
                className="border-input bg-background text-foreground mt-2 w-full max-w-xs rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </section>

          {/* Trip length */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <MapPin className="size-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="text-foreground font-semibold">{t("tripLengthSection")}</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["1", "2", "3"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={selectCardClass(days === d)}
                >
                  <p className="text-foreground font-semibold">{t(`tripDays${d}` as "tripDays1")}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{t(`tripDaysHint_${d}` as "tripDaysHint_1")}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Party */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <UsersRound className="size-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="text-foreground font-semibold">{t("partySection")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {partyOptions.map(({ id, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setPartySize(id)} className={selectCardClass(partySize === id)}>
                  <Icon className="text-primary mb-2 size-6" strokeWidth={1.5} />
                  <p className="text-foreground text-sm font-semibold">{t(`party_${id}` as "party_solo")}</p>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{t(`party_${id}_hint` as "party_solo_hint")}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Pace */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <Compass className="size-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="text-foreground font-semibold">{t("paceSection")}</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {paceOptions.map(({ id, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setPace(id)} className={selectCardClass(pace === id)}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="text-muted-foreground size-5" strokeWidth={1.5} />
                    <span className="text-foreground font-semibold">
                      {id === "calm" ? t("paceCalm") : id === "balanced" ? t("paceBalanced") : t("pacePacked")}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t(`paceHint_${id}` as "paceHint_calm")}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                  <Languages className="size-[18px]" strokeWidth={1.75} />
                </div>
                <h3 className="text-foreground font-semibold">{t("langSection")}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:hidden rounded-full text-xs"
                onClick={() => setLangSheetOpen(true)}
              >
                {t("langMore")}
                <ChevronRight className="size-3.5 opacity-70" />
              </Button>
            </div>
            <Sheet open={langSheetOpen} onOpenChange={setLangSheetOpen}>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>{t("langSheetTitle")}</SheetTitle>
                </SheetHeader>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t("langMoreHint")}</p>
                <p className="text-muted-foreground mt-2 text-xs">{t("langMoreFootnote")}</p>
              </SheetContent>
            </Sheet>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {langPrimary.map(({ id, flag }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLangPref(id)}
                  className={cn(selectCardClass(langPref === id), "flex flex-col items-start")}
                >
                  <span className="text-muted-foreground font-mono text-[10px] font-bold tracking-wider">{flag}</span>
                  <span className="text-foreground mt-1 text-sm font-semibold">
                    {id === "any" ? t("langAny") : id.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={() => setLangSheetOpen(true)}
                className="text-primary text-xs font-semibold underline decoration-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)] decoration-2 underline-offset-[5px] transition-colors hover:decoration-[var(--brand-primary)]"
              >
                {t("langMore")}
              </button>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{t("langMoreHint")}</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

const SCENE_ICONS: Record<SceneMoodId, typeof Moon> = {
  scene_neon: Moon,
  scene_hanok: Landmark,
  scene_cafe: Coffee,
  scene_photo: Camera,
  scene_quiet: Wind,
  scene_romantic: Heart,
};

const STYLE_ICONS: Record<GuardianStyleId, LucideIcon> = {
  style_calm: Coffee,
  style_planner: Compass,
  style_energetic: Zap,
  style_trendy: Sparkles,
  style_flexible: UsersRound,
};

export function ExploreTasteBuilderStep(props: {
  workQuery: string;
  setWorkQuery: (v: string) => void;
  workTokens: string[];
  addWorkToken: (v: string) => void;
  removeWorkToken: (v: string) => void;
  artistQuery: string;
  setArtistQuery: (v: string) => void;
  artistTokens: string[];
  addArtistToken: (v: string) => void;
  removeArtistToken: (v: string) => void;
  sceneMoods: SceneMoodId[];
  toggleSceneMood: (id: SceneMoodId) => void;
  guardianStylePrefs: GuardianStyleId[];
  toggleGuardianStyle: (id: GuardianStyleId) => void;
  locale: string;
}) {
  const t = useTranslations("ExploreJourney");
  const {
    workQuery,
    setWorkQuery,
    workTokens,
    addWorkToken,
    removeWorkToken,
    artistQuery,
    setArtistQuery,
    artistTokens,
    addArtistToken,
    removeArtistToken,
    sceneMoods,
    toggleSceneMood,
    guardianStylePrefs,
    toggleGuardianStyle,
    locale,
  } = props;

  const workList = EXPLORE_WORK_SUGGESTIONS[locale] ?? EXPLORE_WORK_SUGGESTIONS.en;
  const artistList = EXPLORE_ARTIST_SUGGESTIONS[locale] ?? EXPLORE_ARTIST_SUGGESTIONS.en;

  const workFiltered = useMemo(() => {
    const q = workQuery.trim().toLowerCase();
    if (!q) return workList.slice(0, 6);
    return workList.filter((w) => w.toLowerCase().includes(q)).slice(0, 8);
  }, [workList, workQuery]);

  const artistFiltered = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return artistList.slice(0, 6);
    return artistList.filter((w) => w.toLowerCase().includes(q)).slice(0, 8);
  }, [artistList, artistQuery]);

  function tryAddWork() {
    const q = workQuery.trim();
    if (q && !workTokens.includes(q)) addWorkToken(q);
    setWorkQuery("");
  }

  function tryAddArtist() {
    const q = artistQuery.trim();
    if (q && !artistTokens.includes(q)) addArtistToken(q);
    setArtistQuery("");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">{t("tasteBuilderEyebrow")}</p>
        <h2 className="text-text-strong mt-2 text-xl font-semibold sm:text-2xl">{t("tasteBuilderTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{t("tasteBuilderSubtitle")}</p>
      </div>

      <Card className="border-border/70 overflow-hidden rounded-[1.35rem] shadow-[var(--shadow-sm)]">
        <CardContent className="space-y-10 p-5 sm:p-8">
          {/* Works */}
          <section className="space-y-3">
            <h3 className="text-foreground font-semibold">{t("tasteWorksSection")}</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={workQuery}
                onChange={(e) => setWorkQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), tryAddWork())}
                placeholder={t("tasteWorksPlaceholder")}
                className="h-11 flex-1 rounded-xl"
              />
              <Button type="button" className="rounded-xl sm:w-auto" onClick={tryAddWork}>
                {t("tasteAdd")}
              </Button>
            </div>
            {workTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workTokens.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => removeWorkToken(w)}
                    className="bg-primary/12 text-primary border-primary/20 hover:bg-primary/18 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {w} ×
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{t("tasteSuggestions")}</p>
            <div className="flex flex-wrap gap-2">
              {workFiltered.map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={workTokens.includes(w)}
                  onClick={() => addWorkToken(w)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    workTokens.includes(w)
                      ? "border-transparent bg-muted text-muted-foreground"
                      : "border-border/80 bg-card hover:border-primary/35",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </section>

          {/* Artists */}
          <section className="space-y-3">
            <h3 className="text-foreground font-semibold">{t("tasteArtistsSection")}</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={artistQuery}
                onChange={(e) => setArtistQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), tryAddArtist())}
                placeholder={t("tasteArtistsPlaceholder")}
                className="h-11 flex-1 rounded-xl"
              />
              <Button type="button" className="rounded-xl sm:w-auto" onClick={tryAddArtist}>
                {t("tasteAdd")}
              </Button>
            </div>
            {artistTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {artistTokens.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => removeArtistToken(w)}
                    className="bg-primary/12 text-primary border-primary/20 hover:bg-primary/18 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {w} ×
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {artistFiltered.map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={artistTokens.includes(w)}
                  onClick={() => addArtistToken(w)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    artistTokens.includes(w)
                      ? "border-transparent bg-muted text-muted-foreground"
                      : "border-border/80 bg-card hover:border-primary/35",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </section>

          {/* Scene moods */}
          <section className="space-y-4">
            <h3 className="text-foreground font-semibold">{t("tasteSceneSection")}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SCENE_MOOD_IDS.map((id) => {
                const Icon = SCENE_ICONS[id];
                const on = sceneMoods.includes(id);
                return (
                  <button key={id} type="button" onClick={() => toggleSceneMood(id)} className={selectCardClass(on)}>
                    <Icon className="text-muted-foreground mb-2 size-5" strokeWidth={1.5} />
                    <p className="text-foreground text-sm font-semibold">{t(`moodScene_${id.replace(/^scene_/, "")}` as "moodScene_neon")}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {t(`moodScene_${id.replace(/^scene_/, "")}_hint` as "moodScene_neon_hint")}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Guardian style */}
          <section className="space-y-4">
            <h3 className="text-foreground font-semibold">{t("tasteGuardianStyleSection")}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {GUARDIAN_STYLE_IDS.map((id) => {
                const Icon = STYLE_ICONS[id];
                const on = guardianStylePrefs.includes(id);
                return (
                  <button key={id} type="button" onClick={() => toggleGuardianStyle(id)} className={selectCardClass(on)}>
                    <Icon className="text-primary mb-2 size-5" strokeWidth={1.5} />
                    <p className="text-foreground text-sm font-semibold">{t(`moodStyle_${id.replace(/^style_/, "")}` as "moodStyle_calm")}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {t(`moodStyle_${id.replace(/^style_/, "")}_hint` as "moodStyle_calm_hint")}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

export function ExploreResultsDashboard(props: {
  comingSoonArea: boolean;
  results: { guardians: PublicGuardian[]; posts: ContentPost[] };
  region: LaunchAreaSlug | "";
  theme: string;
  days: string;
  partySize: PartySize;
  pace: Pace;
  langPref: LangPref;
  tripWhenPreset: TripWhenPreset | null;
  tripCustomDate: string;
  workTokens: string[];
  artistTokens: string[];
  sceneMoods: SceneMoodId[];
  guardianStylePrefs: GuardianStyleId[];
  onEditConditions: () => void;
  onReRecommend: () => void;
  onPos: (g: PublicGuardian) => string;
  resultsSpinDisabled: boolean;
}) {
  const t = useTranslations("ExploreJourney");
  const tLaunch = useTranslations("LaunchAreas");
  const tThemes = useTranslations("ExperienceThemes");
  const tG = useTranslations("GuardiansDiscover");
  const tTier = useTranslations("GuardianTier");

  const {
    comingSoonArea,
    results,
    region,
    theme,
    days,
    partySize,
    pace,
    langPref,
    tripWhenPreset,
    tripCustomDate,
    workTokens,
    artistTokens,
    sceneMoods,
    guardianStylePrefs,
    onEditConditions,
    onReRecommend,
    onPos,
    resultsSpinDisabled,
  } = props;

  const tripKey = days === "1" ? "tripDays1" : days === "2" ? "tripDays2" : "tripDays3";
  const featured = results.guardians[0];
  const more = results.guardians.slice(1);
  const routePosts = results.posts.filter((p) => postHasRouteJourney(p));
  const articlePosts = results.posts.filter((p) => !postHasRouteJourney(p));

  const reasons = useMemo(() => {
    const lines: string[] = [];
    if (region) {
      const name = (tLaunch.raw(region) as { name: string }).name;
      lines.push(t("reasonArea", { name }));
    }
    if (theme) {
      const title = (tThemes.raw(theme) as { title: string }).title;
      lines.push(t("reasonTheme", { title }));
    }
    lines.push(t("reasonLength", { label: t(tripKey) }));
    if (tripWhenPreset) lines.push(t(`reasonWhen_${tripWhenPreset}` as "reasonWhen_next_week"));
    if (tripCustomDate) lines.push(t("reasonDatePicked"));
    lines.push(t("reasonParty", { label: t(`party_${partySize}` as "party_solo") }));
    if (langPref !== "any") lines.push(t("reasonLang", { code: langPref.toUpperCase() }));
    else lines.push(t("reasonLangAny"));
    if (pace === "calm") lines.push(t("reasonPaceCalm"));
    else if (pace === "packed") lines.push(t("reasonPacePacked"));
    else lines.push(t("reasonPaceBalanced"));
    if (workTokens.length) lines.push(t("reasonWorks"));
    if (artistTokens.length) lines.push(t("reasonArtists"));
    if (sceneMoods.length) lines.push(t("reasonScenes"));
    if (guardianStylePrefs.length) lines.push(t("reasonStyles"));
    return lines;
  }, [
    region,
    theme,
    days,
    tripKey,
    tripWhenPreset,
    tripCustomDate,
    partySize,
    langPref,
    pace,
    workTokens.length,
    artistTokens.length,
    sceneMoods.length,
    guardianStylePrefs.length,
    t,
    tLaunch,
    tThemes,
  ]);

  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      <div>
        <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">{t("dashEyebrow")}</p>
        <h2 className="text-text-strong mt-2 text-xl font-semibold sm:text-2xl">{t("dashTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">{t("dashSubtitle")}</p>
      </div>

      {comingSoonArea ? (
        <Card className="border-dashed rounded-[1.35rem]">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">{t("comingSoonRegion")}</p>
            <Button asChild className="mt-6 rounded-xl">
              <Link href="/guardians">{tG("cardCtaPrimary")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card className="from-primary/[0.06] border-primary/15 rounded-[1.35rem] border bg-gradient-to-br to-transparent shadow-[var(--shadow-sm)]">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-foreground flex items-center gap-2 font-semibold">
                    <Sparkles className="text-primary size-4" />
                    {t("dashSummaryTitle")}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {region ? (
                      <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("summaryRowArea")}</p>
                        <p className="text-foreground mt-0.5 text-sm font-medium">{(tLaunch.raw(region) as { name: string }).name}</p>
                      </div>
                    ) : null}
                    {theme ? (
                      <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("summaryRowMood")}</p>
                        <p className="text-foreground mt-0.5 text-sm font-medium">{(tThemes.raw(theme) as { title: string }).title}</p>
                      </div>
                    ) : null}
                    <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("summaryRowTrip")}</p>
                      <p className="text-foreground mt-0.5 text-sm font-medium">{t(tripKey)}</p>
                    </div>
                    <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("summaryRowParty")}</p>
                      <p className="text-foreground mt-0.5 text-sm font-medium">{t(`party_${partySize}` as "party_solo")}</p>
                    </div>
                    <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("summaryRowLang")}</p>
                      <p className="text-foreground mt-0.5 text-sm font-medium">
                        {langPref === "any" ? t("langAny") : langPref.toUpperCase()}
                      </p>
                    </div>
                    <div className="border-border/50 bg-card/80 rounded-xl border px-3 py-2">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{t("paceSection")}</p>
                      <p className="text-foreground mt-0.5 text-sm font-medium">
                        {pace === "calm" ? t("paceCalm") : pace === "balanced" ? t("paceBalanced") : t("pacePacked")}
                      </p>
                    </div>
                  </div>
                  {(workTokens.length > 0 || artistTokens.length > 0) && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {workTokens.map((w) => (
                        <Badge key={w} variant="secondary" className="rounded-full text-[11px]">
                          {w}
                        </Badge>
                      ))}
                      {artistTokens.map((w) => (
                        <Badge key={w} variant="secondary" className="rounded-full text-[11px]">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onEditConditions}>
                    {t("editConditions")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    disabled={resultsSpinDisabled}
                    onClick={onReRecommend}
                  >
                    {t("reRecommend")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why */}
          <section className="border-border/60 bg-card rounded-[1.35rem] border p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <h3 className="text-foreground font-semibold">{t("dashWhyTitle")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{t("dashWhyIntro")}</p>
            <ul className="mt-4 space-y-2.5">
              {reasons.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className="text-foreground flex gap-2 text-sm leading-relaxed">
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {results.guardians.length === 0 ? (
            <div className="border-border/60 rounded-[1.35rem] border border-dashed bg-muted/10 p-10 text-center">
              <p className="text-foreground text-sm font-semibold">{tG("empty")}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{tG("emptyBody")}</p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured ? (
                <section className="space-y-3">
                  <h3 className="text-foreground font-semibold">{t("dashFeaturedTitle")}</h3>
                  <Card className="border-primary/25 from-primary/[0.07] overflow-hidden rounded-[1.35rem] border-2 bg-gradient-to-br to-card shadow-[var(--shadow-md)]">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="relative aspect-[5/4] w-full lg:aspect-auto lg:max-w-[280px] lg:min-h-[240px]">
                          <Image
                            src={guardianProfileImageUrls(featured).landscape}
                            alt=""
                            fill
                            className="object-cover object-center"
                            sizes="(max-width:1024px) 100vw, 280px"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="rounded-full bg-card/95 text-[10px] font-bold text-[var(--brand-primary)] shadow-sm backdrop-blur-sm">
                              {t("dashMatchBadge")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-center gap-4 p-5 sm:p-6">
                          <div>
                            <span className="text-lg font-semibold">{featured.display_name}</span>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Badge
                                variant={guardianTierBadgeVariant(featured.guardian_tier)}
                                className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}
                              >
                                {tTier(featured.guardian_tier)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">{onPos(featured)}</p>
                            <TrustBadgeRow ids={featured.trust_badge_ids} className="mt-3" size="sm" />
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button asChild className="h-11 w-full rounded-xl font-semibold sm:w-auto sm:min-w-[8rem]">
                              <Link href={`/guardians/${featured.user_id}`}>{tG("cardCtaPrimary")}</Link>
                            </Button>
                            <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto sm:min-w-[8rem]">
                              <Link href={`/book?guardian=${featured.user_id}`}>{tG("cardCtaSecondary")}</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              ) : null}

              {/* More guardians */}
              {more.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-foreground font-semibold">{t("dashMoreGuardians")}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {more.map((g) => (
                      <Card key={g.user_id} className="overflow-hidden rounded-2xl py-0 shadow-[var(--shadow-sm)]">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                              <Image
                                src={guardianProfileImageUrls(g).avatar}
                                alt=""
                                fill
                                className="object-cover object-center"
                                sizes="80px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold leading-snug">{g.display_name}</span>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={guardianTierBadgeVariant(g.guardian_tier)}
                                  className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}
                                >
                                  {tTier(g.guardian_tier)}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">{onPos(g)}</p>
                              <div className="mt-3">
                                <Button asChild size="sm" variant="secondary" className="h-9 w-full rounded-lg text-xs sm:w-auto">
                                  <Link href={`/guardians/${g.user_id}`}>{tG("cardCtaPrimary")}</Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}

          {/* Routes */}
          {routePosts.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-foreground font-semibold">{t("dashRoutesTitle")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {routePosts.map((p) => {
                  const cover = postCoverImageUrl(p);
                  return (
                    <Link
                      key={p.id}
                      href={`/posts/${p.id}`}
                      className="border-border/70 bg-card group flex overflow-hidden rounded-2xl border text-left shadow-[var(--shadow-sm)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-md)]"
                    >
                      <div className="relative aspect-square w-28 shrink-0 bg-muted sm:w-32">
                        {cover ? (
                          <Image src={cover} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="128px" />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                        <Badge variant="outline" className="mb-1 w-fit rounded-full text-[10px]">
                          {t("dashRouteBadge")}
                        </Badge>
                        <p className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{p.summary}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Articles */}
          {articlePosts.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-foreground font-semibold">{t("dashPostsTitle")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {articlePosts.map((p) => {
                  const cover = postCoverImageUrl(p);
                  return (
                    <Link
                      key={p.id}
                      href={`/posts/${p.id}`}
                      className="border-border/70 bg-card group overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)] transition-all hover:border-primary/30"
                    >
                      <div className="relative aspect-[16/9] bg-muted">
                        {cover ? (
                          <Image src={cover} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" sizes="(max-width:768px) 100vw, 50vw" />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <div className="p-4">
                        <p className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{p.summary}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
