import type { GuardianProfile } from "@/types/domain";
import { guardianApprovalLabel, guardianApprovalVariant } from "@/lib/booking-ui";
import { guardianProfileCompleteness, formatGuardianLanguages, regionDisplayName } from "@/lib/guardian-dashboard-utils";
import { guardianTierBadgeVariant, guardianTierLabel } from "@/lib/guardian-tier-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardianProgressRow } from "@/components/guardian/dashboard/guardian-progress-row";

export function GuardianProfileSummaryCard({ profile }: { profile: GuardianProfile }) {
  const complete = guardianProfileCompleteness(profile);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">{profile.display_name}</CardTitle>
            <CardDescription className="mt-1 text-sm">{profile.headline}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={guardianTierBadgeVariant(profile.guardian_tier)} className="font-medium">
              {guardianTierLabel(profile.guardian_tier)}
            </Badge>
            <Badge variant={guardianApprovalVariant(profile.approval_status)} className="font-medium capitalize">
              {guardianApprovalLabel(profile.approval_status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Primary area</p>
            <p className="text-foreground mt-1">{regionDisplayName(profile.primary_region_slug)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Languages</p>
            <p className="text-foreground mt-1 leading-relaxed">{formatGuardianLanguages(profile.languages)}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Introduction</p>
          <p className="text-foreground mt-1 leading-relaxed">{profile.bio}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <GuardianProgressRow label="Profile completeness" current={complete} target={100} suffix="%" />
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            {/* TODO(prod): Content management integration — sync bio, tags, and media from editor. */}
            Stronger profiles help travelers and admins understand your support style before matching.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
