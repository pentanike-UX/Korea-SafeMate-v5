import type { GuardianProfile } from "@/types/domain";
import type { GuardianDashboardSnapshot } from "@/types/guardian-dashboard";

const snapshots: Record<string, GuardianDashboardSnapshot> = {
  g1: {
    guardian_user_id: "g1",
    posts_submitted_this_month: 16,
    posts_approved_this_month: 14,
    posts_pending_review: 2,
    contribution_streak_weeks: 5,
    weekly_approved_target: 3,
    monthly_approved_target: 12,
    category_counts: [
      { label: "Practical", count: 5 },
      { label: "Local tips", count: 4 },
      { label: "Food", count: 3 },
      { label: "K-content", count: 2 },
    ],
    availability_slots: [
      { day: "Mon", ranges: "18:00–22:00 KST" },
      { day: "Wed", ranges: "14:00–21:00 KST" },
      { day: "Sat", ranges: "10:00–20:00 KST" },
      { day: "Sun", ranges: "10:00–16:00 KST" },
    ],
    secondary_region_slugs: ["busan"],
    supported_service_codes: ["arrival", "k_route", "first_24h"],
    trust_health: "strong",
    trust_health_note: "No open trust flags. Mutual reviews trend positive over the last quarter.",
    open_incidents_for_guardian: 1,
    featured_spotlight: {
      eligible: true,
      headline: "Featured spotlight pool",
      body: "You meet editorial quality signals; rotation is curated by admins — not automatic from volume.",
    },
    quality_indicators: [
      { label: "Helpful score (30d)", value: "4.7 avg" },
      { label: "Approval rate", value: "88%" },
      { label: "Intel depth", value: "Strong" },
    ],
  },
  g2: {
    guardian_user_id: "g2",
    posts_submitted_this_month: 14,
    posts_approved_this_month: 13,
    posts_pending_review: 1,
    contribution_streak_weeks: 3,
    weekly_approved_target: 3,
    monthly_approved_target: 12,
    category_counts: [
      { label: "K-content", count: 5 },
      { label: "Shopping", count: 4 },
      { label: "Food", count: 4 },
    ],
    availability_slots: [
      { day: "Tue", ranges: "12:00–20:00 KST" },
      { day: "Thu", ranges: "12:00–20:00 KST" },
      { day: "Sat", ranges: "11:00–19:00 KST" },
    ],
    secondary_region_slugs: [],
    supported_service_codes: ["k_route", "first_24h"],
    trust_health: "good",
    trust_health_note: "One session flagged for follow-up; no policy strikes on file.",
    open_incidents_for_guardian: 0,
    featured_spotlight: {
      eligible: false,
      headline: "Spotlight eligibility",
      body: "Reach consistent weekly approvals and resolve any open notes from moderators.",
    },
    quality_indicators: [
      { label: "Helpful score (30d)", value: "4.5 avg" },
      { label: "Approval rate", value: "82%" },
      { label: "Intel depth", value: "Solid" },
    ],
  },
  g3: {
    guardian_user_id: "g3",
    posts_submitted_this_month: 6,
    posts_approved_this_month: 4,
    posts_pending_review: 2,
    contribution_streak_weeks: 0,
    weekly_approved_target: 3,
    monthly_approved_target: 12,
    category_counts: [
      { label: "Food", count: 2 },
      { label: "Local tips", count: 2 },
    ],
    availability_slots: [{ day: "Fri", ranges: "17:00–21:00 KST" }],
    secondary_region_slugs: [],
    supported_service_codes: ["arrival"],
    trust_health: "good",
    trust_health_note: "Building history — mutual reviews will appear after completed sessions.",
    open_incidents_for_guardian: 0,
    featured_spotlight: {
      eligible: false,
      headline: "Spotlight eligibility",
      body: "Focus on steady, approved posts first; featured placement is separate from contribution count.",
    },
    quality_indicators: [
      { label: "Helpful score (30d)", value: "—" },
      { label: "Approval rate", value: "67%" },
      { label: "Intel depth", value: "Growing" },
    ],
  },
};

function defaultSnapshot(profile: GuardianProfile): GuardianDashboardSnapshot {
  return {
    guardian_user_id: profile.user_id,
    posts_submitted_this_month: profile.posts_approved_last_30d + 2,
    posts_approved_this_month: profile.posts_approved_last_30d,
    posts_pending_review: 1,
    contribution_streak_weeks: 0,
    weekly_approved_target: 3,
    monthly_approved_target: 12,
    category_counts: [],
    availability_slots: [],
    secondary_region_slugs: [],
    supported_service_codes: ["arrival", "k_route", "first_24h"],
    trust_health: "good",
    trust_health_note: "TODO(prod): Compute from reviews + incident queue.",
    open_incidents_for_guardian: 0,
    featured_spotlight: {
      eligible: false,
      headline: "Featured spotlight",
      body: "Complete your profile and publishing cadence; admins curate spotlight separately.",
    },
    quality_indicators: [],
  };
}

export function getGuardianDashboardSnapshot(profile: GuardianProfile): GuardianDashboardSnapshot {
  return snapshots[profile.user_id] ?? defaultSnapshot(profile);
}
