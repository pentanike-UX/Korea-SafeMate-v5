import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { mockContentPosts, mockTravelerReviews, mockTravelerReviewQuotes } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { TextActionLink } from "@/components/ui/text-action";
import { HomeHeroCarousel } from "@/components/home/home-hero-carousel";
import { HomeDualCtaSection } from "@/components/home/home-dual-cta-section";
import { HomeExploreBundle } from "@/components/home/home-explore-bundle";
import {
  Construction,
  FileText,
  Languages,
  MessageCircle,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";

export async function HomeFortyTwoPage() {
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const isKo = locale === "ko";

  const seoulPosts = mockContentPosts
    .filter((p) => p.status === "approved" && p.region_slug === "seoul")
    .sort((a, b) => b.popular_score - a.popular_score)
    .slice(0, 6);

  const reviews = mockTravelerReviews.slice(0, 3);

  return (
    <div className="bg-[var(--bg-page)]">
      <HomeHeroCarousel />

      <HomeExploreBundle />

      {/* Recommended posts / routes */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16 md:py-20">
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{t("postsSectionTitle")}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("postsSectionLead")}</p>
            </div>
            <TextActionLink href="/posts" className="shrink-0 self-start sm:self-end">
              {t("postsCta")}
            </TextActionLink>
          </div>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {seoulPosts.map((p) => (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className="border-border/80 bg-card group rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-sm)] transition-all active:scale-[0.99] sm:p-5 hover:border-[color-mix(in_srgb,var(--brand-trust-blue)_35%,var(--border))] hover:shadow-[var(--shadow-md)]"
              >
                <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase">
                  <FileText className="size-3 text-[var(--brand-trust-blue)]" aria-hidden />
                  {p.tags.slice(0, 2).join(" · ")}
                </p>
                <h3 className="text-foreground mt-2 font-semibold leading-snug group-hover:text-[var(--link-color)]">{p.title}</h3>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{p.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-border/50 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16 md:py-20">
          <div className="mb-8 max-w-xl sm:mb-10">
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{t("trust42Title")}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t("trust42Lead")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {(
              [
                ["trust42CardVerified", "trust42CardVerifiedDesc", ShieldCheck],
                ["trust42CardLanguage", "trust42CardLanguageDesc", Languages],
                ["trust42CardReviews", "trust42CardReviewsDesc", MessageCircle],
                ["trust42CardFast", "trust42CardFastDesc", Zap],
              ] as const
            ).map(([title, body, Icon]) => (
              <Card key={title} className="border-border/70 rounded-[var(--radius-md)] border bg-[var(--bg-surface-subtle)] shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[var(--brand-trust-blue)] mb-3 flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-trust-blue-soft)]">
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="text-foreground font-semibold">{t(title)}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t(body)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-gradient-to-b from-[var(--brand-trust-blue-soft)]/50 to-transparent dark:from-[var(--brand-trust-blue-soft)]/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16 md:py-20">
          <div className="mb-8 max-w-xl sm:mb-10">
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{t("reviewsSectionTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("reviewsSectionLead")}</p>
          </div>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {reviews.map((r) => {
              const q = mockTravelerReviewQuotes[r.id];
              const text = q ? (isKo ? q.ko : q.en) : r.comment ?? "";
              return (
                <Card key={r.id} className="border-border/70 rounded-[var(--radius-md)] border bg-card/95">
                  <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={i < r.rating ? "size-4 fill-current" : "size-4"} aria-hidden />
                      ))}
                    </div>
                    <p className="text-foreground text-sm leading-relaxed">&ldquo;{text}&rdquo;</p>
                    <p className="text-muted-foreground text-xs font-medium">42 Guardians traveler</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-text-strong text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{t("aboutSectionTitle")}</h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">{t("aboutSectionLead")}</p>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{t("aboutSectionBody")}</p>
            <div className="mt-8 flex justify-center">
              <TextActionLink href="/about">{isKo ? "자세히 보기" : "Learn more"}</TextActionLink>
            </div>
          </div>
        </div>
      </section>

      {/* Coming soon cities */}
      <section id="coming-cities" className="bg-muted/30 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
          <div className="border-border/70 bg-card max-w-xl rounded-[var(--radius-md)] border p-4 ring-1 ring-border/40 sm:p-5">
            <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
              <span className="bg-muted inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)]" aria-hidden>
                <Construction className="text-[var(--brand-trust-blue)] size-3.5" strokeWidth={2} />
              </span>
              {t("comingSectionBadge")}
            </p>
            <h2 className="text-text-strong mt-3 text-lg font-semibold tracking-tight sm:text-xl">{t("comingSectionTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("comingSectionLead")}</p>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{t("comingSectionNote")}</p>
          </div>
        </div>
      </section>

      <HomeDualCtaSection />
    </div>
  );
}
