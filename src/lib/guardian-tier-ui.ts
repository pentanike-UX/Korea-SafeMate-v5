import type { GuardianTier } from "@/types/domain";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

export function guardianTierLabel(tier: GuardianTier): string {
  const map: Record<GuardianTier, string> = {
    contributor: "Contributor",
    active_guardian: "Active Guardian",
    verified_guardian: "Verified Guardian",
  };
  return map[tier];
}

export function guardianTierDescription(tier: GuardianTier): string {
  const map: Record<GuardianTier, string> = {
    contributor: "Can share local intel; not eligible for paid matching on its own.",
    active_guardian: "Meets contribution cadence; still separate from matching approval.",
    verified_guardian: "Ops-verified for trusted support & matching after policy checks.",
  };
  return map[tier];
}

export function guardianTierBadgeVariant(tier: GuardianTier): BadgeVariant {
  switch (tier) {
    case "verified_guardian":
      return "default";
    case "active_guardian":
      return "secondary";
    default:
      return "outline";
  }
}
