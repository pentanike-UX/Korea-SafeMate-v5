import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { HOME_CTA_IMAGES } from "@/data/home-cta-images";
import { ArrowRight } from "lucide-react";

export async function HomeDualCtaSection() {
  const t = await getTranslations("Home");

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 pb-16 sm:px-5 sm:py-14 sm:pb-20">
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {/* 여행자 · 가디언 찾기 */}
        <div className="border-border/60 flex min-h-[min(22rem,70vw)] flex-col-reverse overflow-hidden rounded-[var(--radius-lg)] border bg-card shadow-[var(--shadow-sm)] sm:min-h-[17rem] sm:flex-row sm:items-stretch">
          <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:max-w-[min(100%,22rem)] sm:p-8">
            <div>
              <h2 className="text-text-strong text-lg font-semibold tracking-tight text-balance sm:text-xl">
                {t("dualCtaTravelerTitle")}
              </h2>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed sm:text-base">{t("dualCtaTravelerLead")}</p>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full rounded-[var(--radius-md)] font-semibold sm:w-auto sm:min-w-[11rem]">
                <Link href="/guardians">{t("dualCtaTravelerPrimary")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="group/cta2 w-full rounded-[var(--radius-md)] border-2 bg-background font-semibold sm:w-auto sm:min-w-[11rem]"
              >
                <Link href="/explore" className="inline-flex items-center justify-center gap-2">
                  {t("dualCtaTravelerSecondary")}
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform duration-200 group-hover/cta2:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative h-52 w-full shrink-0 sm:h-auto sm:min-h-[17rem] sm:w-[min(42%,280px)]">
            <Image
              src={HOME_CTA_IMAGES.travelerPortrait}
              alt={t("dualCtaTravelerImageAlt")}
              fill
              className="object-cover object-[center_15%] sm:object-[center_20%]"
              sizes="(max-width:1024px) 100vw, 280px"
              priority={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent sm:bg-gradient-to-l sm:from-card sm:via-card/30 sm:to-transparent"
              aria-hidden
            />
          </div>
        </div>

        {/* 가디언 지원 */}
        <div className="flex min-h-[min(22rem,70vw)] flex-col-reverse overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-zinc-900 text-white shadow-[var(--shadow-md)] sm:min-h-[17rem] sm:flex-row-reverse sm:items-stretch">
          <div className="relative z-[1] flex flex-1 flex-col justify-center gap-4 p-6 sm:max-w-[min(100%,22rem)] sm:p-8">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-balance text-white sm:text-xl">{t("dualCtaGuardianTitle")}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/88 sm:text-base">{t("dualCtaGuardianLead")}</p>
            </div>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full rounded-[var(--radius-md)] border border-white/35 bg-white font-semibold text-zinc-900 hover:bg-white/95 sm:w-auto sm:min-w-[11rem]"
            >
              <Link href="/guardians/apply">{t("dualCtaGuardianButton")}</Link>
            </Button>
          </div>
          <div className="relative h-52 w-full shrink-0 sm:h-auto sm:min-h-[17rem] sm:w-[min(42%,280px)]">
            <Image
              src={HOME_CTA_IMAGES.guardianPortrait}
              alt={t("dualCtaGuardianImageAlt")}
              fill
              className="object-cover object-[center_18%] sm:object-[center_22%]"
              sizes="(max-width:1024px) 100vw, 280px"
              priority={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/25 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-zinc-900/40 sm:to-zinc-900"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
