import type { GuardianApprovalStatus, GuardianProfile, GuardianTier } from "@/types/domain";
import type {
  GuardianLifecycleStatus,
  GuardianSeedRecord,
  GuardianSeedRow,
  ProductGuardianTier,
} from "./guardian-seed-types";
import { resolveGuardianDisplayName } from "./guardian-seed-display-names";

function lifecycleToApproval(status: GuardianLifecycleStatus): GuardianApprovalStatus {
  switch (status) {
    case "draft":
      return "pending";
    case "submitted":
      return "under_review";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "suspended":
      return "paused";
  }
}

function productTierToGuardianTier(tier: ProductGuardianTier): GuardianTier {
  switch (tier) {
    case "Starter":
      return "contributor";
    case "Active":
    case "Pro":
      return "active_guardian";
    case "Elite":
      return "verified_guardian";
  }
}

/** 시드 가디언 제거됨 — 빈 배열 유지 (레거시 import 호환). */
export const GUARDIAN_SEED_ROWS: readonly GuardianSeedRow[] = [];

function rowToGuardianProfile(row: GuardianSeedRow): GuardianProfile {
  return {
    user_id: row.id,
    display_name: resolveGuardianDisplayName(row.id, row.display_name),
    headline: row.headline,
    bio: row.bio,
    guardian_tier: productTierToGuardianTier(row.product_tier),
    approval_status: lifecycleToApproval(row.lifecycle_status),
    years_in_seoul: row.years_in_seoul,
    photo_url: `/mock/profiles/profile_${String(row.profile_image_index).padStart(2, "0")}.jpg`,
    languages: row.languages.map((l) => ({
      guardian_user_id: row.id,
      language_code: l.code,
      proficiency: l.proficiency,
    })),
    primary_region_slug: row.primary_region_slug,
    posts_approved_last_30d: row.posts_approved_last_30d,
    posts_approved_last_7d: row.posts_approved_last_7d,
    featured: row.featured,
    influencer_seed: row.influencer_seed,
    matching_enabled: row.matching_enabled,
    avg_traveler_rating: row.avg_traveler_rating,
    expertise_tags: row.expertise_tags,
  };
}

export function buildGuardianSeedRecords(): GuardianSeedRecord[] {
  return GUARDIAN_SEED_ROWS.map((row) => {
    const approved = row.posts_plan.approved;
    return {
      ...rowToGuardianProfile(row),
      email: row.email,
      lifecycle_status: row.lifecycle_status,
      product_tier: row.product_tier,
      seed_points_available: row.seed_points_available,
      seed_approved_post_count: approved,
    };
  });
}
