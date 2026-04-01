import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SpotDetailWorkspaceClient } from "@/components/explore/spot-detail-workspace-client";
import { getV4SpotBySlug, getV4RouteBySlug, getV4SpotById } from "@/data/v4";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { V4_SPOTS } = await import("@/data/v4/spots");
  return V4_SPOTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const spot = getV4SpotBySlug(slug);
  const t = await getTranslations("V4.spotDetail");
  if (!spot) return { title: t("notFound") };
  return { title: `${spot.name} | ${BRAND.name}`, description: spot.shortDescription };
}

export default async function SpotDetailPage({ params }: Props) {
  const { slug } = await params;
  const spot = getV4SpotBySlug(slug);
  if (!spot) notFound();

  const primaryRouteSlug = spot.routeRefs[0] ?? null;
  const route = primaryRouteSlug ? getV4RouteBySlug(primaryRouteSlug) : null;
  const nextSpot = spot.nearbyNextStopId ? getV4SpotById(spot.nearbyNextStopId) : null;
  const stopOnRoute = route?.stops.find((s) => s.spotId === spot.id);
  const whyInRouteCopy = stopOnRoute?.whyHere ?? spot.routeInclusionNote ?? spot.shortDescription;

  const payload = {
    name: spot.name,
    city: spot.city,
    district: spot.district,
    coverImage: spot.images[0] ?? "",
    whyInRouteCopy,
    routeMeta:
      route && stopOnRoute
        ? { order: stopOnRoute.order, routeTitle: route.title, routeSlug: route.slug }
        : null,
    lat: spot.coordinates.lat,
    lng: spot.coordinates.lng,
    bestTime: spot.bestTime,
    crowdRisk: spot.crowdRisk,
    photoTone: spot.photoTone,
    vibeTags: spot.vibeTags,
    nextSpot: nextSpot
      ? { slug: nextSpot.slug, name: nextSpot.name, shortDescription: nextSpot.shortDescription }
      : null,
    primaryRouteSlug,
  };

  return <SpotDetailWorkspaceClient spot={payload} />;
}
