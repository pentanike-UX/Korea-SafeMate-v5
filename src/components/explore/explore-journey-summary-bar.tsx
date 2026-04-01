"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatDecisionInterpretLine } from "@/lib/explore-decision-interpret";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles } from "lucide-react";
import type { PartySize, SceneMoodId, GuardianStyleId, TripWhenPreset } from "@/components/explore/explore-journey-data";

type Pace = "calm" | "balanced" | "packed";
type LangPref = "en" | "ko" | "ja" | "any";

export function ExploreJourneySummaryBar({
  step,
  region,
  theme,
  days,
  partySize,
  pace,
  langPref,
  tripWhenPreset,
  sceneMoods,
  guardianStylePrefs,
  workTokens,
  artistTokens,
  onEditBasics,
  variant = "journey",
  onEditSchedule,
  onEditTaste,
}: {
  step: number;
  region: LaunchAreaSlug | "";
  theme: string;
  days: string;
  partySize: PartySize;
  pace: Pace;
  langPref: LangPref;
  tripWhenPreset: TripWhenPreset | null;
  sceneMoods: SceneMoodId[];
  guardianStylePrefs: GuardianStyleId[];
  workTokens: string[];
  artistTokens: string[];
  onEditBasics?: () => void;
  variant?: "journey" | "results";
  onEditSchedule?: () => void;
  onEditTaste?: () => void;
}) {
  const t = useTranslations("ExploreJourney");
  const tLaunch = useTranslations("LaunchAreas");
  const tThemes = useTranslations("ExperienceThemes");

  const hasAnything = Boolean(region) || Boolean(theme) || step >= 2;

  const tripKey = days === "1" ? "tripDays1" : days === "2" ? "tripDays2" : "tripDays3";

  const chipBase =
    "inline-flex min-h-7 max-w-[min(100%,11rem)] min-w-0 shrink items-center justify-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium sm:max-w-[min(100%,12rem)] sm:px-2.5";
  const chipRegionTheme = cn(chipBase, "bg-primary/15 border border-primary/30 text-primary");
  const chipSchedule = cn(chipBase, "bg-muted/50 border border-border/50 text-muted-foreground");
  const chipMood = cn(chipBase, "bg-amber-500/10 border border-amber-400/25 text-amber-300");
  const chipTaste = cn(chipBase, "bg-emerald-500/10 border border-emerald-400/25 text-emerald-300");

  const isResults = variant === "results";

  const interpretLine = useMemo(() => {
    if (!hasAnything || !isResults || step < 2) return "";
    return formatDecisionInterpretLine(t, tLaunch, tThemes, { region, theme, days, partySize, pace });
  }, [hasAnything, isResults, step, t, tLaunch, tThemes, region, theme, days, partySize, pace]);

  if (!hasAnything) return null;

  const hasEditActions =
    (step >= 2 && onEditBasics) ||
    (isResults && onEditSchedule) ||
    (isResults && onEditTaste);

  return (
    <div
      className={cn(
        "border-border/60 bg-background/88 supports-backdrop-filter:backdrop-blur-md sticky top-0 z-30 -mx-4 mb-6 border-b px-3 py-2.5 sm:-mx-6 sm:px-6 sm:py-3",
        isResults && "border-primary/20 bg-primary/[0.04]",
      )}
      role="region"
      aria-label={t("summaryBarAria")}
    >
      <div className="flex flex-col gap-2">
        {interpretLine ? (
          <p className="text-foreground text-sm font-semibold leading-snug tracking-tight mb-1">
            {interpretLine}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center min-[400px]:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 min-[400px]:gap-2">
            <span className="text-muted-foreground inline-flex w-full min-w-0 items-center gap-1 text-[10px] font-semibold tracking-wide uppercase min-[400px]:w-auto">
              <Sparkles className="text-primary size-3 shrink-0" aria-hidden />
              <span className="truncate">{isResults ? t("summaryBarLabelResults") : t("summaryBarLabel")}</span>
            </span>
            {region ? (
              <Badge className={chipRegionTheme}>
                {(tLaunch.raw(region) as { name: string }).name}
              </Badge>
            ) : null}
            {theme ? (
              <Badge className={chipRegionTheme}>
                {(tThemes.raw(theme) as { title: string }).title}
              </Badge>
            ) : null}
            {step >= 2 ? (
              <>
                <Badge className={chipSchedule}>
                  {t(tripKey)}
                </Badge>
                <Badge className={chipSchedule}>
                  {t(`party_${partySize}` as "party_solo")}
                </Badge>
                <Badge className={chipSchedule}>
                  {pace === "calm" ? t("paceCalm") : pace === "balanced" ? t("paceBalanced") : t("pacePacked")}
                </Badge>
                <Badge className={chipSchedule}>
                  {langPref === "any" ? t("langAny") : langPref.toUpperCase()}
                </Badge>
                {tripWhenPreset ? (
                  <Badge className={chipSchedule}>
                    {t(`tripWhen_${tripWhenPreset}` as "tripWhen_weekend")}
                  </Badge>
                ) : null}
              </>
            ) : null}
            {step >= 3 ? (
              <>
                {sceneMoods.slice(0, 3).map((id) => (
                  <Badge key={id} className={chipMood}>
                    {t(`moodScene_${id.replace(/^scene_/, "")}` as "moodScene_neon")}
                  </Badge>
                ))}
                {sceneMoods.length > 3 ? (
                  <span className="text-muted-foreground shrink-0 text-[11px]">+{sceneMoods.length - 3}</span>
                ) : null}
                {guardianStylePrefs
                  .filter((id) => id !== "style_no_match_test")
                  .slice(0, 2)
                  .map((id) => (
                    <Badge key={id} className={cn(chipTaste, "max-w-[min(100%,9rem)] sm:max-w-[min(100%,10rem)]")}>
                      {t(`moodStyle_${id.replace(/^style_/, "")}` as "moodStyle_calm")}
                    </Badge>
                  ))}
                {workTokens.slice(0, 2).map((w) => (
                  <Badge key={w} className={cn(chipTaste, "max-w-[min(100%,9rem)] sm:max-w-[min(100%,10rem)]")}>
                    {w}
                  </Badge>
                ))}
                {artistTokens.slice(0, 2).map((w) => (
                  <Badge key={w} className={cn(chipTaste, "max-w-[min(100%,9rem)] sm:max-w-[min(100%,10rem)]")}>
                    {w}
                  </Badge>
                ))}
              </>
            ) : null}
          </div>

          {hasEditActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex h-9 min-h-9 shrink-0 items-center rounded-xl bg-secondary px-4 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("editConditions")}
                <ChevronDown className="ml-1 size-3.5" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {step >= 2 && onEditBasics ? (
                  <DropdownMenuItem onClick={onEditBasics}>
                    {isResults ? t("editConditions") : t("editAreaTheme")}
                  </DropdownMenuItem>
                ) : null}
                {isResults && onEditSchedule ? (
                  <DropdownMenuItem onClick={onEditSchedule}>
                    {t("editScheduleShort")}
                  </DropdownMenuItem>
                ) : null}
                {isResults && onEditTaste ? (
                  <DropdownMenuItem onClick={onEditTaste}>
                    {t("editTasteShort")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
