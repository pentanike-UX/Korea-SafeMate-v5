import Link from "next/link";
import { notFound } from "next/navigation";
import {
  mockContentCategories,
  mockContentPosts,
  mockGuardians,
  mockRegions,
} from "@/data/mock";
import { enrichInsight } from "@/lib/explore-utils";
import { ExploreCtas } from "@/components/explore/explore-ctas";
import { ExploreDiscoveryClient } from "@/components/explore/explore-discovery-client";
import { ExploreInsightCard } from "@/components/explore/explore-insight-card";
import { ExploreRegionGuardians } from "@/components/explore/explore-region-guardians";
import { ExploreRegionHero } from "@/components/explore/explore-region-hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ region: string }> };

export function generateStaticParams() {
  return mockRegions.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { region } = await params;
  const r = mockRegions.find((x) => x.slug === region);
  return {
    title: r ? `${r.name} · Explore` : "Region",
  };
}

export default async function ExploreRegionPage({ params }: Props) {
  const { region } = await params;
  const meta = mockRegions.find((r) => r.slug === region);
  if (!meta) notFound();

  const posts = mockContentPosts.filter((p) => p.region_slug === region);
  const approved = posts.filter((p) => p.status === "approved");
  const pending = posts.filter((p) => p.status === "pending");

  const insights = approved.map((p) =>
    enrichInsight(p, mockRegions, mockContentCategories, mockGuardians),
  );

  const pendingInsights = pending.map((p) =>
    enrichInsight(p, mockRegions, mockContentCategories, mockGuardians),
  );

  return (
    <>
      <ExploreRegionHero region={meta} />

      <ExploreRegionGuardians regionSlug={region} guardians={mockGuardians} />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Card className="border-primary/10 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tags & topics in this hub</CardTitle>
            <CardDescription>
              Filter posts below — same categories as the national Explore view.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {mockContentCategories.map((c) => (
              <Badge key={c.id} variant="outline" className="font-normal">
                {c.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <ExploreDiscoveryClient
        allInsights={insights}
        categories={mockContentCategories}
        showRegionOnCards={false}
        showFeaturedRow
        sectionId="intel"
      />

      <ExploreCtas />

      {pendingInsights.length > 0 ? (
        <section className="mx-auto max-w-6xl border-t px-4 py-10 sm:px-6">
          <h2 className="text-lg font-semibold">In moderation (preview)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Shown for ops alignment — travelers normally see approved posts only.
            {/* TODO(prod): Remove from public build or gate behind `admin` role. */}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {pendingInsights.map((i) => (
              <ExploreInsightCard key={i.post.id} insight={i} showRegion={false} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <Link href="/explore" className="text-primary text-sm font-medium hover:underline">
          ← All regions
        </Link>
      </div>
    </>
  );
}
