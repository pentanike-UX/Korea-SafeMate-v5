import type { GuardianProfile } from "@/types/domain";
import type { GuardianMarketingProfile } from "@/types/guardian-marketing";
import type { LaunchAreaSlug } from "@/types/launch-area";
import { defaultMarketingFromGuardian } from "@/lib/dev/mock-guardian-auth";
import { mockGuardianMarketingById } from "@/data/mock/guardian-marketing";
import { mockGuardians } from "@/data/mock/guardians";

export type PublicGuardian = GuardianProfile & GuardianMarketingProfile;

export function getGuardianMarketing(userId: string): GuardianMarketingProfile | null {
  return mockGuardianMarketingById[userId] ?? null;
}

export function mergePublicGuardian(g: GuardianProfile): PublicGuardian {
  const m = getGuardianMarketing(g.user_id);
  if (m) return { ...g, ...m };
  return { ...g, ...defaultMarketingFromGuardian(g) };
}

export function listPublicGuardians(): PublicGuardian[] {
  return mockGuardians.map((g) => mergePublicGuardian(g));
}

export function getPublicGuardianById(userId: string): PublicGuardian | null {
  const g = mockGuardians.find((x) => x.user_id === userId);
  if (!g) return null;
  return mergePublicGuardian(g);
}


const ACTIVE_LAUNCH: LaunchAreaSlug[] = ["gwanghwamun", "gangnam"];

export function isActiveLaunchArea(slug: LaunchAreaSlug): boolean {
  return ACTIVE_LAUNCH.includes(slug);
}

export function listLaunchReadyGuardians(): PublicGuardian[] {
  return listPublicGuardians().filter((x) => isActiveLaunchArea(x.launch_area_slug));
}
