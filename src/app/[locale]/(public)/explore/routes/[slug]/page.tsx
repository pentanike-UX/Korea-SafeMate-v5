import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getV4RouteBySlug } from "@/data/v4";
import { BRAND } from "@/lib/constants";
import { listSimilarV4Routes } from "@/lib/v4/similar-routes";
import { RouteDetailExperience } from "@/components/route-curated/route-detail-experience";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { listPublishedV4Routes } = await import("@/data/v4");
  return listPublishedV4Routes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const route = getV4RouteBySlug(slug);
  const t = await getTranslations("V4.routeDetail");
  if (!route) return { title: t("notFound") };
  return { title: `${route.title} | ${BRAND.name}`, description: route.subtitle };
}

export default async function RouteDetailPage({ params }: Props) {
  const { slug } = await params;
  const route = getV4RouteBySlug(slug);
  if (!route) notFound();

  const alt = route.alternativeSlug ? getV4RouteBySlug(route.alternativeSlug) : null;
  const similar = listSimilarV4Routes(route).map((r) => ({ slug: r.slug, title: r.title, summary: r.summary }));

  return <RouteDetailExperience route={route} alternativeRoute={alt ?? null} similar={similar} />;
}
