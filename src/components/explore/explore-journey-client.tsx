"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { mockContentPosts, mockExperienceThemes, mockLaunchAreas } from "@/data/mock";
import { listLaunchReadyGuardians, type PublicGuardian } from "@/lib/guardian-public";
import type { ContentPost } from "@/types/domain";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgeRow } from "@/components/forty-two/trust-badges";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";

const STEPS = 5;

type LangPref = "en" | "ko" | "ja" | "any";
type Pace = "calm" | "balanced" | "packed";

export function ExploreJourneyClient() {
  const t = useTranslations("ExploreJourney");
  const tLaunch = useTranslations("LaunchAreas");
  const tThemes = useTranslations("ExperienceThemes");
  const tG = useTranslations("GuardiansDiscover");
  const tTier = useTranslations("GuardianTier");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<LaunchAreaSlug | "">("");
  const [theme, setTheme] = useState<string>("");
  const [enteredExploreViaPreset, setEnteredExploreViaPreset] = useState(false);
  const [days, setDays] = useState<string>("1");
  const [langPref, setLangPref] = useState<LangPref>("any");
  const [pace, setPace] = useState<Pace>("balanced");
  const [tastes, setTastes] = useState<string[]>([]);
  const [resultsSpin, setResultsSpin] = useState(0);

  useEffect(() => {
    const a = searchParams.get("area");
    const th = searchParams.get("theme");
    const validArea = Boolean(a && mockLaunchAreas.some((x) => x.slug === a && x.active));
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
    tastes.forEach((tid) => {
      if (tid === "tastePhoto") g.sort((a, b) => (b.theme_slugs.includes("photo_route") ? 1 : 0) - (a.theme_slugs.includes("photo_route") ? 1 : 0));
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
      .slice(0, 6);

    return { guardians: g.slice(0, 6), posts };
  }, [region, theme, langPref, pace, tastes, comingSoonArea, resultsSpin]);

  function toggleTaste(id: string) {
    setTastes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function pos(g: PublicGuardian) {
    return isKo ? g.positioning.ko : g.positioning.en;
  }

  const summaryChips: { label: string }[] = [];
  if (region) {
    const copy = tLaunch.raw(region) as { name: string };
    summaryChips.push({ label: copy.name });
  }
  if (theme) {
    const copy = tThemes.raw(theme) as { title: string };
    summaryChips.push({ label: copy.title });
  }
  const tripKey = days === "1" ? "tripDays1" : days === "2" ? "tripDays2" : "tripDays3";
  summaryChips.push({ label: t(tripKey) });
  summaryChips.push({
    label:
      langPref === "any"
        ? `${t("langPref")}: ${t("langAny")}`
        : `${t("langPref")}: ${langPref.toUpperCase()}`,
  });

  return (
    <div className="bg-[var(--bg-page)] min-h-[70vh]">
      <section className="border-border/60 border-b bg-white/90">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="text-primary inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            42 Guardians
          </p>
          <h1 className="text-text-strong mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("heroTitle")}</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-[15px]">{t("heroBody")}</p>
        </div>
      </section>

      <div id="journey-steps" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/guardians">{t("btnGuardiansFirst")}</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setEnteredExploreViaPreset(false);
              setStep(0);
            }}
          >
            {t("btnStart")}
          </Button>
        </div>
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

        {step >= 2 && region && theme ? (
          <div className="border-primary/20 bg-primary/5 mb-8 rounded-2xl border px-4 py-3 sm:px-5">
            <p className="text-muted-foreground text-[11px] font-medium sm:text-xs">
              {enteredExploreViaPreset ? t("presetFromHome") : t("summaryLabel")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
                {(tLaunch.raw(region) as { name: string }).name}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
                {(tThemes.raw(theme) as { title: string }).title}
              </Badge>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setStep(0)}>
                {t("editAreaTheme")}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-text-strong text-xl font-semibold">{t("stepRegion")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mockLaunchAreas.map((a) => {
                const copy = tLaunch.raw(a.slug) as {
                  name: string;
                  blurb: string;
                  landmark: string;
                  imageAlt: string;
                };
                const selected = region === a.slug;
                return (
                  <button
                    key={a.slug}
                    type="button"
                    onClick={() => setRegion(a.slug)}
                    className={cn(
                      "border-border/80 relative flex flex-col overflow-hidden rounded-2xl border text-left shadow-[var(--shadow-sm)] transition-all",
                      selected ? "border-primary ring-primary/25 ring-2" : "hover:border-primary/30",
                    )}
                  >
                    <div className="relative aspect-[16/9]">
                      <Image src={a.imageUrl} alt={copy.imageAlt} fill className="object-cover" sizes="400px" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      <div className="absolute right-2 bottom-2 left-2">
                        <p className="line-clamp-2 text-left text-xs font-semibold text-white drop-shadow-sm">
                          {copy.landmark}
                        </p>
                      </div>
                      {!a.active ? (
                        <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Soon
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold">{copy.name}</p>
                      <p className="text-primary mt-0.5 text-xs font-medium">{copy.landmark}</p>
                      <p className="text-muted-foreground mt-1 text-sm">{copy.blurb}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-text-strong text-xl font-semibold">{t("stepTheme")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mockExperienceThemes.map((th) => {
                const copy = tThemes.raw(th.slug) as { title: string; subtitle: string };
                const selected = theme === th.slug;
                return (
                  <button
                    key={th.slug}
                    type="button"
                    onClick={() => setTheme(th.slug)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      selected ? "border-primary bg-primary/5 ring-primary/20 ring-2" : "border-border/80 hover:border-primary/25",
                    )}
                  >
                    <div className="mb-3 h-1.5 w-full rounded-full" style={{ background: th.gradient }} />
                    <p className="font-semibold">{copy.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm">{copy.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-text-strong text-xl font-semibold">{t("stepTrip")}</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">{t("tripDays")}</p>
              <div className="flex flex-wrap gap-2">
                {(["1", "2", "3"] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={days === d ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setDays(d)}
                  >
                    {t(`tripDays${d}` as "tripDays1")}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">{t("langPref")}</p>
              <div className="flex flex-wrap gap-2">
                {(["any", "en", "ko", "ja"] as const).map((l) => (
                  <Button
                    key={l}
                    type="button"
                    variant={langPref === l ? "default" : "outline"}
                    className="rounded-full capitalize"
                    onClick={() => setLangPref(l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">{t("pace")}</p>
              <div className="flex flex-wrap gap-2">
                {(["calm", "balanced", "packed"] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={pace === p ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setPace(p)}
                  >
                    {p === "calm" ? t("paceCalm") : p === "balanced" ? t("paceBalanced") : t("pacePacked")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-text-strong text-xl font-semibold">{t("stepTaste")}</h2>
            <p className="text-muted-foreground text-sm">{t("tasteHint")}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["tastePhoto", t("tastePhoto")],
                  ["tasteFood", t("tasteFood")],
                  ["tasteShop", t("tasteShop")],
                  ["tasteSolo", t("tasteSolo")],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant={tastes.includes(id) ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => toggleTaste(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-text-strong text-xl font-semibold">{t("stepResults")}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{t("summaryLabel")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summaryChips.map((c) => (
                  <Badge key={c.label} variant="secondary" className="rounded-full px-3 py-1 font-medium">
                    {c.label}
                  </Badge>
                ))}
              </div>
              {!comingSoonArea ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setStep(0)}>
                    {t("editConditions")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    disabled={results.guardians.length === 0}
                    onClick={() => setResultsSpin((x) => x + 1)}
                  >
                    {t("reRecommend")}
                  </Button>
                </div>
              ) : null}
            </div>

            {comingSoonArea ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-sm leading-relaxed">{t("comingSoonRegion")}</p>
                  <Button asChild className="mt-6 rounded-xl">
                    <Link href="/guardians">{tG("cardCtaPrimary")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h3 className="text-foreground mb-4 font-semibold">{tG("heroTitle")}</h3>
                  <div className="space-y-4">
                    {results.guardians.length === 0 ? (
                      <div className="border-border/60 rounded-2xl border border-dashed bg-muted/10 p-8 text-center">
                        <p className="text-foreground text-sm font-semibold">{tG("empty")}</p>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{tG("emptyBody")}</p>
                      </div>
                    ) : (
                      results.guardians.map((g) => (
                        <Card key={g.user_id} className="overflow-hidden rounded-2xl py-0">
                          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                            <div className="relative mx-auto h-40 w-full max-w-[200px] shrink-0 sm:mx-0 sm:h-28 sm:max-w-none sm:w-28">
                              <Image src={g.photo_url} alt="" fill className="rounded-xl object-cover sm:rounded-lg" sizes="200px" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{g.display_name}</span>
                                <Badge variant={guardianTierBadgeVariant(g.guardian_tier)} className="text-[10px]">
                                  {tTier(g.guardian_tier)}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{pos(g)}</p>
                              <TrustBadgeRow ids={g.trust_badge_ids} className="mt-2" size="xs" />
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                              <Button asChild size="sm" className="rounded-xl">
                                <Link href={`/guardians/${g.user_id}`}>{tG("cardCtaPrimary")}</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="rounded-xl">
                                <Link href={`/book?guardian=${g.user_id}`}>{tG("cardCtaSecondary")}</Link>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground mb-4 font-semibold">{t("relatedPosts")}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {results.posts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/posts/${p.id}`}
                        className="border-border/70 bg-card rounded-xl border p-4 text-sm shadow-[var(--shadow-sm)] transition-colors hover:border-primary/25"
                      >
                        <p className="line-clamp-2 font-medium leading-snug">{p.title}</p>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{p.summary}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep((s) => s + 1)}>
                {t("skipStep")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
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
                className="rounded-xl"
                disabled={step === 0 && !region}
                onClick={() => setStep((s) => s + 1)}
              >
                {t("next")}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
            {step === 3 ? (
              <Button type="button" className="rounded-xl" onClick={() => setStep(4)}>
                {t("seeResults")}
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">{tG("launchOnlyNote")}</p>
      </div>
    </div>
  );
}
