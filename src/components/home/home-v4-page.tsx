import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublishedV4Routes } from "@/data/v4";
import { V4RouteCard } from "@/components/v4/v4-route-card";
import { Button } from "@/components/ui/button";

const MOOD_KEYS = ["calm", "late", "solo", "rain", "firstNight"] as const;

export async function HomeV4Page() {
  const t = await getTranslations("V4.home");
  const routes = listPublishedV4Routes().slice(0, 3);

  return (
    <div className="bg-[var(--bg-page)] pb-24 lg:pb-12">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-page)] to-[var(--bg-page)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 50% at 100% 0%, color-mix(in srgb, var(--brand-trust-blue) 14%, transparent), transparent),
              radial-gradient(ellipse 60% 40% at 0% 20%, color-mix(in srgb, var(--text-secondary) 8%, transparent), transparent)`,
          }}
        />
        <div className="page-container relative py-16 sm:py-20 md:py-28">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">{t("eyebrow")}</p>
          <h1 className="text-[var(--text-strong)] mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.08]">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">{t("heroLead")}</p>

          <div className="mt-10">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase">{t("moodLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {MOOD_KEYS.map((k) => (
                <Button
                  key={k}
                  asChild
                  variant="secondary"
                  className="rounded-full border-0 bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-sm)] ring-1 ring-[var(--border-default)] hover:bg-[var(--brand-primary-soft)]"
                >
                  <Link href={`/planner?mood=${k}`}>{t(`mood.${k}`)}</Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-[var(--radius-lg)] px-8 text-base font-semibold">
              <Link href="/planner">{t("ctaPlanner")}</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-[var(--text-strong)]/85 rounded-[var(--radius-lg)] px-6 text-base font-medium"
            >
              <Link href="/explore/routes">{t("ctaExplore")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="page-container section-stack py-12 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="text-[var(--text-strong)] text-2xl font-semibold tracking-tight sm:text-3xl">{t("routesTitle")}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">{t("routesLead")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((r) => (
            <V4RouteCard key={r.id} route={r} saveHref="/login?next=/mypage/saved" />
          ))}
        </div>
        <div>
          <Button asChild variant="outline" className="rounded-[var(--radius-lg)] border-[var(--border-strong)]">
            <Link href="/explore/routes">{t("routesAll")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
