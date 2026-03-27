/** Domain types — align with `supabase/schema.sql`. */

/** Platform-facing role. Users may effectively wear multiple hats in production; this is the primary label. */
export type UserRole =
  | "traveler"
  | "contributor"
  | "active_guardian"
  | "verified_guardian"
  | "admin";

/** Guardian program tier — open participation ≠ trusted matching. */
export type GuardianTier = "contributor" | "active_guardian" | "verified_guardian";

export type BookingStatus =
  | "requested"
  | "reviewing"
  | "matched"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "issue_reported";

/** Legacy verification workflow; kept for admin review before matching unlock. */
export type GuardianApprovalStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "paused"
  | "rejected";

export type ServiceTypeCode = "arrival" | "k_route" | "first_24h";

export type ContentPostStatus = "draft" | "pending" | "approved" | "rejected";

export type ContentPostKind =
  | "hot_place"
  | "local_tip"
  | "food"
  | "shopping"
  | "k_content"
  | "practical";

export type RegionPhase = 1 | 2;

/** Explore sorting — TODO(prod): backed by DB columns or materialized views. */
export type ExploreSortMode = "latest" | "popular" | "recommended";

export type ContactChannel = "telegram" | "kakao" | "whatsapp" | "line" | "email" | "other";

/** Channels offered on the booking handoff step (subset + email). */
export type BookingHandoffChannel = "kakao" | "telegram" | "whatsapp" | "email";

export type TravelerUserType = "foreign_traveler" | "korean_traveler";

export type BookingInterestId =
  | "k_pop"
  | "k_drama"
  | "k_movie"
  | "food"
  | "shopping"
  | "local_support";

export type BookingSupportNeedId =
  | "transportation"
  | "check_in"
  | "ordering"
  | "local_tips"
  | "route_support"
  | "practical_guidance";

/**
 * Full guest booking request — maps to `bookings.request_payload` + core columns.
 * TODO(prod): Align with authenticated traveler_user_id when logged in.
 */
export interface BookingRequestPayload {
  service_code: ServiceTypeCode;
  traveler_user_type: TravelerUserType;
  region_slug: string;
  requested_date: string;
  requested_time: string;
  /** ISO 8601 combined in Asia/Seoul for DB `requested_start`. */
  requested_start_iso: string;
  traveler_count: number;
  preferred_language: string;
  first_time_in_korea: boolean;
  meeting_point: string;
  accommodation_area: string;
  interests: BookingInterestId[];
  support_needs: BookingSupportNeedId[];
  guest_name: string;
  guest_email: string;
  special_requests: string;
  preferred_contact_channel: BookingHandoffChannel;
  contact_handle: string;
  agreements: {
    scope: boolean;
    admin_review: boolean;
    no_immediate_chat: boolean;
  };
  submitted_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface TravelerProfile {
  user_id: string;
  full_name: string;
  country_code: string;
  phone: string | null;
  preferred_language: string;
}

export interface GuardianLanguage {
  guardian_user_id: string;
  language_code: string;
  proficiency: "basic" | "conversational" | "fluent" | "native";
}

export interface GuardianProfile {
  user_id: string;
  display_name: string;
  headline: string;
  bio: string;
  /** Tier within the guardian program (contribution + trust ladder). */
  guardian_tier: GuardianTier;
  approval_status: GuardianApprovalStatus;
  years_in_seoul: number;
  photo_url: string | null;
  /** Optional overrides — see `guardianProfileImageUrls` fallbacks. */
  avatar_image_url?: string | null;
  list_card_image_url?: string | null;
  detail_hero_image_url?: string | null;
  languages: GuardianLanguage[];
  primary_region_slug: string;
  /** Rolling MVP metrics — TODO(prod): compute from `content_posts` + `guardian_activity_logs`. */
  posts_approved_last_30d: number;
  posts_approved_last_7d: number;
  featured: boolean;
  influencer_seed: boolean;
  /** Ops-gated; true only for verified + policy — never auto from post count alone. */
  matching_enabled: boolean;
  /** TODO(prod): Aggregate from `traveler_reviews`. */
  avg_traveler_rating: number | null;
  /** Neighborhood / theme tags for Explore trust UI. */
  expertise_tags: string[];
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  name_ko: string;
  phase: RegionPhase;
  short_description: string;
  /** Longer copy for region hub pages. */
  detail_blurb: string;
}

export interface ContentCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}

/** Shape of guardian-authored content — v2 route product uses spot / route / hybrid. */
export type ContentPostFormat = "article" | "spot" | "route" | "hybrid";

export type RouteTransportMode = "walk" | "car" | "mixed";

export type RouteDifficulty = "easy" | "moderate" | "active";

export type RouteRecommendedTimeOfDay = "morning" | "afternoon" | "evening" | "night" | "flexible";

/** WGS84 — swap map provider without changing domain. */
export interface MapLatLng {
  lat: number;
  lng: number;
}

export interface RouteJourneyMetadata {
  transport_mode: RouteTransportMode;
  /** Total leg time in minutes (manual or from routing API later). */
  estimated_total_duration_minutes: number;
  /** km — manual or computed when routing is wired. */
  estimated_total_distance_km: number;
  recommended_time_of_day: RouteRecommendedTimeOfDay;
  difficulty: RouteDifficulty;
  recommended_traveler_types: string[];
  night_friendly: boolean;
}

/** One stop on a guardian-curated route (or the single anchor for a spot post). */
export interface RouteSpot {
  id: string;
  order: number;
  title: string;
  place_name: string;
  /** From place search / geocoder; optional for legacy posts. */
  address_line?: string;
  short_description: string;
  body: string;
  /** Editor uploads (`/...` paths). Empty or legacy `https://` → UI maps `public/mock/posts` by 텍스트. */
  image_urls: string[];
  recommend_reason: string;
  stay_duration_minutes: number;
  photo_tip: string;
  caution: string;
  lat: number;
  lng: number;
  featured?: boolean;
}

export interface RouteJourney {
  metadata: RouteJourneyMetadata;
  spots: RouteSpot[];
  /** Display path (spot-to-spot or routed polyline). Provider-agnostic. */
  path: MapLatLng[];
}

export interface ContentPost {
  id: string;
  author_user_id: string;
  author_display_name: string;
  region_slug: string;
  category_slug: string;
  kind: ContentPostKind;
  title: string;
  body: string;
  /** Short line for cards; TODO(prod): generated or editor field. */
  summary: string;
  status: ContentPostStatus;
  created_at: string;
  tags: string[];
  /** Mock engagement — TODO(prod): votes / views from analytics. */
  usefulness_votes: number;
  /** Post-level helpful score 1–5 from travelers, optional. */
  helpful_rating: number | null;
  popular_score: number;
  recommended_score: number;
  featured: boolean;
  /** Omitted or `article` for legacy text-only posts. */
  post_format?: ContentPostFormat;
  /**
   * List/detail hero when set (로컬 경로 권장). `https://` 는 표시에서 무시되고 `public/mock/posts` 매핑을 씁니다.
   * 루트 포스트는 스팟 `image_urls`도 동일 규칙.
   */
  cover_image_url?: string | null;
  route_journey?: RouteJourney;
  /** Short bullets for traveler “insight” strip on route detail. */
  route_highlights?: string[];
  /** Service intro mock — not real UGC; show subtle “(샘플)” in UI. */
  is_sample?: boolean;
  /** Denormalized flag for filtering (true when `route_journey` is present). */
  has_route?: boolean;
}

export interface ServiceType {
  code: ServiceTypeCode;
  name: string;
  short_description: string;
  duration_hours: number;
  base_price_krw: number;
}

export interface Booking {
  id: string;
  traveler_user_id: string | null;
  guardian_user_id: string | null;
  service_code: ServiceTypeCode;
  status: BookingStatus;
  requested_start: string;
  party_size: number;
  pickup_hint: string | null;
  notes: string | null;
  preferred_contact_channel: ContactChannel | null;
  contact_handle_hint: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  /** Full wizard payload for admin review & ops. */
  request_payload?: BookingRequestPayload | null;
  created_at: string;
  updated_at: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_at: string;
  actor_user_id: string | null;
  note: string | null;
}

/** Traveler → Guardian after a session / booking. */
export interface TravelerReview {
  id: string;
  booking_id: string;
  traveler_user_id: string;
  guardian_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** Guardian → Traveler (mutual trust / behavior quality). */
export interface GuardianReview {
  id: string;
  booking_id: string;
  guardian_user_id: string;
  traveler_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ContactMethod {
  id: string;
  user_id: string;
  channel: ContactChannel;
  handle: string;
  is_preferred: boolean;
  verified: boolean;
}

export interface FeaturedGuardian {
  guardian_user_id: string;
  tagline: string;
  priority: number;
  active: boolean;
}

export interface GuardianActivityLog {
  id: string;
  guardian_user_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  booking_id: string;
  reported_by_user_id: string;
  summary: string;
  severity: "low" | "medium" | "high";
  created_at: string;
  resolved_at: string | null;
}

export interface AdminNote {
  id: string;
  entity_type: "booking" | "guardian" | "traveler" | "content_post";
  entity_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
}

/** View models for UI (joined mock data). */
export interface BookingWithDetails extends Booking {
  traveler_name: string;
  guardian_name: string | null;
  service_name: string;
}
