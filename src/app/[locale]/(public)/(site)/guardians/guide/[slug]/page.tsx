import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getV4GuardianBySlug } from "@/data/v4/guardians";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { V4_GUARDIANS } = await import("@/data/v4/guardians");
  return V4_GUARDIANS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const g = getV4GuardianBySlug(slug);
  const t = await getTranslations("V4.guardianDetail");
  if (!g) return { title: t("notFound") };
  return { title: `${g.displayName} | ${BRAND.name}`, description: g.shortBio };
}

export default async function GuardianGuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const g = getV4GuardianBySlug(slug);
  const t = await getTranslations("V4.guardianDetail");
  if (!g) notFound();

  return (
    <div className="bg-[var(--bg-page)] pb-24">
      <div className="relative aspect-[21/10] w-full max-w-[100rem] mx-auto overflow-hidden">
        <Image src={g.cover} alt="" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)] to-transparent" />
      </div>
      <div className="page-container -mt-20 relative max-w-3xl sm:-mt-24">
        <div className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-md)] ring-1 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[var(--border-default)]">
              <Image src={g.avatar} alt="" fill className="object-cover" sizes="80px" />
            </div>
            <div>
              <h1 className="text-[var(--text-strong)] text-2xl font-semibold sm:text-3xl">{g.displayName}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{g.languages.join(" · ")}</p>
              <p className="text-muted-foreground mt-2 text-sm">{g.availability}</p>
            </div>
          </div>
          <p className="text-foreground mt-8 leading-relaxed">{g.shortBio}</p>
          <section className="mt-8">
            <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("areas")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{g.specialtyAreas.join(" · ")}</p>
          </section>
          <section className="mt-6">
            <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("vibes")}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.specialtyVibes.map((v) => (
                <span key={v} className="bg-[var(--brand-primary-soft)] rounded-full px-3 py-1 text-xs font-medium">
                  {v}
                </span>
              ))}
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("trust")}</h2>
            <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
              {g.trustSignals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-[var(--radius-lg)]">
              <Link href={`/guardians/guide/${g.slug}/request`}>{t("askCta")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-[var(--radius-lg)]">
              <Link href="/planner">{t("plannerCta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
