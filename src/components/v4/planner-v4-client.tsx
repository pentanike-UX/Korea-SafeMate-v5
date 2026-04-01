"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { AIPlannerInput, TimeOfDay } from "@/domain/curated-experience";
import { WorkspaceBinder, type WorkspaceRegistration } from "@/components/app-shell/workspace-registry";
import { FullBleedAmbientMap } from "@/components/map-shell/full-bleed-ambient-map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MapRegion = "seoul_core" | "han_river" | "gangnam";

const MAP_REGIONS: { key: MapRegion; labelKey: "seoulCore" | "hanRiver" | "gangnam" }[] = [
  { key: "seoul_core", labelKey: "seoulCore" },
  { key: "han_river", labelKey: "hanRiver" },
  { key: "gangnam", labelKey: "gangnam" },
];

type ChipDef<K extends string> = { key: K; label: string };

function encodePayload(input: AIPlannerInput): string {
  const json = JSON.stringify(input);
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(json)));
}

function moodDefaults(mood: string | null): Partial<AIPlannerInput> {
  switch (mood) {
    case "calm":
      return { vibe: "calm", energy: "light" };
    case "late":
      return { timeBudget: "full_evening", vibe: "calm", timeOfDay: "late_night" satisfies TimeOfDay };
    case "solo":
      return { companions: "solo", safetySensitive: "high" };
    case "rain":
      return { weatherSensitive: true, vibe: "calm" };
    case "firstNight":
      return { timeBudget: "half_day", companions: "couple" };
    default:
      return {};
  }
}

export function PlannerV4Client({ mood }: { mood: string | null }) {
  const t = useTranslations("V4.planner");
  const tHome = useTranslations("V4.home");
  const router = useRouter();
  const [mapRegion, setMapRegion] = useState<MapRegion>("seoul_core");

  const seeded = useMemo(() => moodDefaults(mood), [mood]);

  const [companions, setCompanions] = useState<AIPlannerInput["companions"]>(() => seeded.companions ?? "solo");
  const [timeBudget, setTimeBudget] = useState<AIPlannerInput["timeBudget"]>(() => seeded.timeBudget ?? "half_day");
  const [timeOfDay, setTimeOfDay] = useState<AIPlannerInput["timeOfDay"]>(() => seeded.timeOfDay ?? "flex");
  const [vibe, setVibe] = useState<AIPlannerInput["vibe"]>(() => seeded.vibe ?? "calm");
  const [budget, setBudget] = useState<AIPlannerInput["budget"]>("medium");
  const [energy, setEnergy] = useState<AIPlannerInput["energy"]>(() => seeded.energy ?? "moderate");
  const [transport, setTransport] = useState<AIPlannerInput["transport"]>(["walk"]);
  const [weatherSensitive, setWeatherSensitive] = useState(() => seeded.weatherSensitive ?? false);
  const [safetySensitive, setSafetySensitive] = useState<AIPlannerInput["safetySensitive"]>(
    () => seeded.safetySensitive ?? "medium",
  );
  const [languageComfort, setLanguageComfort] = useState<AIPlannerInput["languageComfort"]>("english");
  const [areaHint, setAreaHint] = useState("");

  const companionsOpts: ChipDef<AIPlannerInput["companions"]>[] = useMemo(
    () => [
      { key: "solo", label: t("opt.companions.solo") },
      { key: "couple", label: t("opt.companions.couple") },
      { key: "friends", label: t("opt.companions.friends") },
      { key: "family", label: t("opt.companions.family") },
    ],
    [t],
  );

  const submit = () => {
    const input: AIPlannerInput = {
      companions,
      timeBudget,
      timeOfDay,
      vibe,
      budget,
      energy,
      transport: transport.length ? transport : ["walk"],
      weatherSensitive,
      safetySensitive,
      languageComfort,
      areaHint: areaHint.trim() || undefined,
    };
    const p = encodePayload(input);
    router.push(`/planner/result?p=${encodeURIComponent(p)}`);
  };

  const chipRow = <T extends string>(opts: ChipDef<T>[], value: T, onChange: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
            value === o.key
              ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
              : "bg-card text-[var(--text-strong)]/80 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const panelBody = (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{tHome("mapRegionLabel")}</h2>
        <div className="flex flex-wrap gap-2">
          {MAP_REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setMapRegion(r.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm",
                mapRegion === r.key
                  ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
                  : "bg-card text-[var(--text-strong)]/85 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
              )}
            >
              {tHome(`mapRegions.${r.labelKey}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.companions")}</h2>
        {chipRow(companionsOpts, companions, setCompanions)}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.time")}</h2>
        {chipRow(
          [
            { key: "90m", label: t("opt.time.90m") },
            { key: "half_day", label: t("opt.time.half") },
            { key: "full_evening", label: t("opt.time.evening") },
          ],
          timeBudget,
          setTimeBudget,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.timeOfDay")}</h2>
        {chipRow(
          [
            { key: "flex", label: t("timeOfDayOpt.flex") },
            { key: "morning", label: t("timeOfDayOpt.morning") },
            { key: "afternoon", label: t("timeOfDayOpt.afternoon") },
            { key: "evening", label: t("timeOfDayOpt.evening") },
            { key: "late_night", label: t("timeOfDayOpt.late_night") },
          ] as ChipDef<AIPlannerInput["timeOfDay"]>[],
          timeOfDay,
          setTimeOfDay,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.vibe")}</h2>
        {chipRow(
          [
            { key: "calm", label: t("opt.vibe.calm") },
            { key: "lively", label: t("opt.vibe.lively") },
            { key: "romantic", label: t("opt.vibe.romantic") },
            { key: "focused", label: t("opt.vibe.focused") },
          ],
          vibe,
          setVibe,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.budget")}</h2>
        {chipRow(
          [
            { key: "low", label: t("opt.budget.low") },
            { key: "medium", label: t("opt.budget.medium") },
            { key: "high", label: t("opt.budget.high") },
          ],
          budget,
          setBudget,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.energy")}</h2>
        {chipRow(
          [
            { key: "light", label: t("opt.energy.light") },
            { key: "moderate", label: t("opt.energy.moderate") },
            { key: "high", label: t("opt.energy.high") },
          ],
          energy,
          setEnergy,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.transport")}</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "walk", label: t("opt.transport.walk") },
              { key: "transit", label: t("opt.transport.transit") },
              { key: "taxi", label: t("opt.transport.taxi") },
              { key: "mixed", label: t("opt.transport.mixed") },
            ] as const
          ).map((o) => {
            const on = transport.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() =>
                  setTransport((prev) => (on ? prev.filter((x) => x !== o.key) : [...prev, o.key]))
                }
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                  on
                    ? "bg-[var(--text-strong)] text-[var(--text-on-brand)]"
                    : "bg-card text-[var(--text-strong)]/80 ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.sensitivity")}</h2>
        <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] bg-card p-4 ring-1 ring-[var(--border-default)]">
          <input
            type="checkbox"
            checked={weatherSensitive}
            onChange={(e) => setWeatherSensitive(e.target.checked)}
            className="size-4 rounded border-[var(--border-strong)]"
          />
          <span className="text-sm font-medium">{t("opt.weather")}</span>
        </label>
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase">{t("sec.safety")}</p>
          {chipRow(
            [
              { key: "low", label: t("opt.safety.low") },
              { key: "medium", label: t("opt.safety.medium") },
              { key: "high", label: t("opt.safety.high") },
            ],
            safetySensitive,
            setSafetySensitive,
          )}
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase">{t("sec.language")}</p>
          {chipRow(
            [
              { key: "english", label: t("opt.lang.en") },
              { key: "korean", label: t("opt.lang.ko") },
              { key: "mixed", label: t("opt.lang.mixed") },
            ],
            languageComfort,
            setLanguageComfort,
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("sec.area")}</h2>
        <input
          value={areaHint}
          onChange={(e) => setAreaHint(e.target.value)}
          placeholder={t("areaPlaceholder")}
          className="border-input bg-card text-foreground placeholder:text-muted-foreground w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </section>
    </div>
  );

  const registration: WorkspaceRegistration = {
    contextKey: "planner",
    panelTitle: t("title"),
    panelSubtitle: t("lead"),
    panelBody,
    stickyAction: (
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-[20px] text-base font-semibold shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
        onClick={submit}
      >
        {t("ctaGenerate")}
      </Button>
    ),
    map: <FullBleedAmbientMap region={mapRegion} className="h-full w-full" />,
    initialSheetSnap: "half",
  };

  return (
    <>
      <WorkspaceBinder registration={registration} />
    </>
  );
}
