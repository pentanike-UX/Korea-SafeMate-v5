import Link from "next/link";
import {
  mockContactMethods,
  mockFeaturedGuardians,
  mockGuardians,
} from "@/data/mock";
import { guardianTierBadgeVariant, guardianTierLabel } from "@/lib/guardian-tier-ui";
import { guardianApprovalLabel, guardianApprovalVariant } from "@/lib/booking-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_CHANNEL_LABELS } from "@/lib/constants";

export const metadata = {
  title: "Guardians | Korea SafeMate",
  description: "Tiers, reputation, and featured locals — open participation ≠ trusted matching.",
};

function contactFor(guardianId: string) {
  return mockContactMethods.filter((c) => c.user_id === guardianId);
}

export default function GuardiansPage() {
  const featuredIds = new Set(
    mockFeaturedGuardians.filter((f) => f.active).map((f) => f.guardian_user_id),
  );
  const featured = mockGuardians.filter((g) => featuredIds.has(g.user_id));
  const ordered = [
    ...featured.sort((a, b) => (b.influencer_seed ? 1 : 0) - (a.influencer_seed ? 1 : 0)),
    ...mockGuardians.filter((g) => !featuredIds.has(g.user_id)),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Guardian community</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          Anyone can contribute local intel.{" "}
          <span className="text-foreground font-medium">Active Guardian</span> status reflects
          sustained, approved posts.{" "}
          <span className="text-foreground font-medium">Verified Guardian</span> is a separate bar
          for matching — policy review and ops-gated{" "}
          <code className="text-xs">matching_enabled</code>, never automatic from volume alone.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Featured & seed program</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Early influencers and strong contributors can be highlighted — transparent to users, managed in admin.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {mockFeaturedGuardians.filter((f) => f.active).map((f) => {
            const g = mockGuardians.find((x) => x.user_id === f.guardian_user_id);
            if (!g) return null;
            return (
              <Card
                key={f.guardian_user_id}
                id={`guardian-${g.user_id}`}
                className="border-primary/20 shadow-sm scroll-mt-24"
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{g.display_name}</CardTitle>
                    {g.influencer_seed ? (
                      <Badge variant="secondary">Seed partner</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{f.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant={guardianTierBadgeVariant(g.guardian_tier)}>
                    {guardianTierLabel(g.guardian_tier)}
                  </Badge>
                  {g.matching_enabled ? (
                    <Badge variant="outline">Matching enabled</Badge>
                  ) : (
                    <Badge variant="outline">Intel & reputation only</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">Directory</h2>
        <div className="mt-6 flex flex-col gap-4">
          {ordered.map((g) => {
            const contacts = contactFor(g.user_id);
            return (
              <Card key={g.user_id} id={`guardian-${g.user_id}`} className="border-primary/10 scroll-mt-24">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">{g.display_name}</CardTitle>
                      <CardDescription>{g.headline}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={guardianTierBadgeVariant(g.guardian_tier)}>
                        {guardianTierLabel(g.guardian_tier)}
                      </Badge>
                      <Badge variant={guardianApprovalVariant(g.approval_status)}>
                        {guardianApprovalLabel(g.approval_status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 text-sm">
                  <p className="leading-relaxed">{g.bio}</p>
                  <p className="text-xs">
                    Posts (30d / 7d approved):{" "}
                    <span className="text-foreground font-medium">
                      {g.posts_approved_last_30d} / {g.posts_approved_last_7d}
                    </span>
                  </p>
                  {contacts.length > 0 ? (
                    <div>
                      <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
                        Preferred channels (handoff)
                      </p>
                      <ul className="mt-1 space-y-1 text-xs">
                        {contacts.map((c) => (
                          <li key={c.id}>
                            {CONTACT_CHANNEL_LABELS[c.channel]}
                            {c.is_preferred ? " · preferred" : ""}: {c.handle}
                            {c.verified ? " ✓" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/guardians/apply">Start contributing</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/book">Request matched support</Link>
        </Button>
      </div>
    </div>
  );
}
