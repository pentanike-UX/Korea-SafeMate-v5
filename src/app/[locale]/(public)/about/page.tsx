import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { ArrowRight, Compass, Users } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("AboutPage");
  return {
    title: `${t("metaTitle")} | ${BRAND.name}`,
    description: t("metaDescription"),
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-28">
      <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <div className="text-muted-foreground mt-4 space-y-4 text-[15px] leading-relaxed sm:text-base">{children}</div>
    </section>
  );
}

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");
  const philosophyKeys = ["philosophy1", "philosophy2", "philosophy3", "philosophy4"] as const;

  return (
    <div className="bg-[var(--bg-page)]">
      <div className="page-container max-w-3xl py-14 sm:py-20 md:py-24">
        <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">{BRAND.name}</p>
        <h1 className="text-text-strong mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.5rem]">{t("title")}</h1>
        <p className="text-muted-foreground mt-6 text-lg leading-relaxed sm:text-xl">{t("lead")}</p>
        <p className="text-muted-foreground mt-6 text-[15px] leading-relaxed sm:text-base">{t("intro")}</p>

        <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
          <Section title={t("sectionPurposeTitle")}>
            <p>{t("sectionPurposeBody")}</p>
          </Section>
          <Section title={t("sectionVisionTitle")}>
            <p>{t("sectionVisionBody")}</p>
          </Section>
          <Section title={t("sectionDirectionTitle")}>
            <p>{t("sectionDirectionBody")}</p>
          </Section>

          <section className="scroll-mt-28">
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl">{t("manifestoTitle")}</h2>
            <blockquote className="border-primary/35 text-text-strong/95 mt-5 border-l-[3px] pl-5 text-[15px] leading-relaxed italic sm:text-lg sm:leading-relaxed">
              {t("manifestoBody")}
            </blockquote>
          </section>

          <Section title={t("philosophyTitle")}>
            <p>{t("philosophyIntro")}</p>
            <ul className="list-none space-y-3.5 pl-0">
              {philosophyKeys.map((key, i) => (
                <li
                  key={key}
                  className="border-border/70 bg-card/40 flex gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 shadow-[var(--shadow-sm)]"
                >
                  <span className="bg-primary/12 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-relaxed">{t(key)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={t("serviceTitle")}>
            <p>{t("serviceBody")}</p>
          </Section>
        </div>

        <div className="border-border/60 mt-14 flex flex-col gap-3 sm:mt-16 sm:flex-row sm:flex-wrap sm:gap-4">
          <Button
            asChild
            size="lg"
            className="group/cta h-12 w-full rounded-[var(--radius-md)] border-0 bg-[var(--brand-primary)] px-6 font-semibold text-[var(--text-on-brand)] shadow-md ring-1 ring-[color-mix(in_srgb,var(--brand-primary)_35%,#000)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_92%,#000)] sm:min-h-[3.25rem] sm:min-w-[13rem] sm:flex-1"
          >
            <Link href="/explore" className="inline-flex w-full items-center justify-center gap-2.5">
              <Compass className="size-5 shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
              <span>{t("ctaExplore")}</span>
              <ArrowRight
                className="size-4 shrink-0 opacity-90 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="group/cta2 border-border/80 h-12 w-full rounded-[var(--radius-md)] border-2 bg-background px-6 font-semibold shadow-sm hover:bg-muted/40 sm:min-h-[3.25rem] sm:min-w-[13rem] sm:flex-1"
          >
            <Link href="/guardians" className="inline-flex w-full items-center justify-center gap-2.5">
              <Users className="text-[var(--brand-trust-blue)] size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>{t("ctaGuardians")}</span>
              <ArrowRight
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-hover/cta2:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
