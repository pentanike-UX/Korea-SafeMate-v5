import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { listPublishedV4Routes } from "@/data/v4";
import { V4RouteCard } from "@/components/v4/v4-route-card";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [{ slug: "seoul" }];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("V4.cityHub");
  if (slug !== "seoul") return { title: t("notFound") };
  return { title: `${t("seoulTitle")} | ${BRAND.name}`, description: t("seoulDescription") };
}

export default async function CityHubPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("V4.cityHub");
  if (slug !== "seoul") notFound();

  const routes = listPublishedV4Routes();

  return (
    <div className="bg-[var(--bg-page)] page-container py-10 pb-24 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t("hubEyebrow")}</p>
        <h1 className="text-[var(--text-strong)] mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("seoulTitle")}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t("seoulLead")}</p>
      </header>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {routes.map((r) => (
          <V4RouteCard key={r.id} route={r} saveHref="/login?next=/mypage/saved" />
        ))}
      </div>
      <div className="mt-10">
        <Link href="/planner" className="text-[var(--brand-trust-blue)] text-sm font-semibold hover:underline">
          {t("plannerCta")}
        </Link>
      </div>
    </div>
  );
}
