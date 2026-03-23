import {
  mockContentCategories,
  mockContentPosts,
  mockFeaturedGuardians,
  mockGuardians,
  mockRegions,
} from "@/data/mock";
import { enrichInsight } from "@/lib/explore-utils";
import { ExploreCtas } from "@/components/explore/explore-ctas";
import { ExploreDiscoveryClient } from "@/components/explore/explore-discovery-client";
import { ExploreHero } from "@/components/explore/explore-hero";
import { FeaturedGuardiansSection } from "@/components/explore/featured-guardians-section";
import { RegionGridCards } from "@/components/explore/region-grid-cards";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Explore | Korea SafeMate",
  description: "Region-based local intelligence — moderated, practical, guardian-grounded.",
};

export default function ExplorePage() {
  const approved = mockContentPosts.filter((p) => p.status === "approved");
  const insights = approved.map((p) =>
    enrichInsight(p, mockRegions, mockContentCategories, mockGuardians),
  );

  return (
    <>
      <ExploreHero
        title="Real local intelligence — before you book"
        description="Explore is curated for decisions: hot places, food queues, K-content execution, shopping mechanics, and practical arrival tips. Most insights come from Guardians with visible tiers and contribution history — not generic blog posts or open forums."
      >
        <Button asChild className="rounded-xl">
          <Link href="#intel">Jump to intel</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/book">Book support</Link>
        </Button>
      </ExploreHero>

      <RegionGridCards regions={mockRegions} />

      <FeaturedGuardiansSection featured={mockFeaturedGuardians} guardians={mockGuardians} />

      <ExploreCtas />

      <ExploreDiscoveryClient
        allInsights={insights}
        categories={mockContentCategories}
        regions={mockRegions}
        showRegionOnCards
        showFeaturedRow
        sectionId="intel"
      />
    </>
  );
}
