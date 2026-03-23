import Link from "next/link";
import type { FeaturedGuardian, GuardianProfile } from "@/types/domain";
import { guardianTierBadgeVariant, guardianTierLabel } from "@/lib/guardian-tier-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

type Props = {
  featured: FeaturedGuardian[];
  guardians: GuardianProfile[];
};

export function FeaturedGuardiansSection({ featured, guardians }: Props) {
  const rows = featured
    .filter((f) => f.active)
    .sort((a, b) => b.priority - a.priority)
    .map((f) => {
      const g = guardians.find((x) => x.user_id === f.guardian_user_id);
      return g ? { f, g } : null;
    })
    .filter(Boolean) as { f: FeaturedGuardian; g: GuardianProfile }[];

  if (rows.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Featured Guardians</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Trusted locals and seed partners — highlighted for quality, not pay-to-play ads.
          {/* TODO(prod): `featured_guardians` table + admin scheduling + disclosure labels. */}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ f, g }) => (
          <Card
            key={f.guardian_user_id}
            className="border-primary/15 scroll-mt-24 overflow-hidden shadow-sm"
            id={`guardian-${g.user_id}`}
          >
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground font-semibold">{g.display_name}</p>
                  <Badge variant={guardianTierBadgeVariant(g.guardian_tier)}>
                    {guardianTierLabel(g.guardian_tier)}
                  </Badge>
                  {g.influencer_seed ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Seed partner
                    </Badge>
                  ) : null}
                </div>
                <p className="text-primary mt-1 text-sm font-medium">{f.tagline}</p>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {g.avg_traveler_rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="text-primary size-3.5 fill-current" aria-hidden />
                      {g.avg_traveler_rating.toFixed(1)} avg traveler rating
                    </span>
                  ) : null}
                  <span>{g.posts_approved_last_30d} posts / 30d</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.expertise_tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-xl shrink-0">
                <Link href={`/guardians#guardian-${g.user_id}`}>View profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
