/**
 * Korea SafeMate v4 — curated route / spot / guardian domain model.
 * Aligned with editorial + AI + guardian hybrid; status for CMS-style workflows.
 */

export type ContentStatus = "draft" | "ready" | "published";

export type RouteSourceType = "editorial" | "guardian" | "ai";

export type BudgetLevel = 1 | 2 | 3 | 4 | 5;

export type TransportMode = "walk" | "transit" | "taxi" | "mixed";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late_night";

export interface RouteStop {
  id: string;
  spotId: string;
  order: number;
  stayMinutes: number;
  transitionHint: string;
  whyHere: string;
}

export interface CuratedRoute {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  city: string;
  district: string;
  vibeTags: string[];
  bestFor: string[];
  timeOfDay: TimeOfDay[];
  durationMinutes: number;
  budgetLevel: BudgetLevel;
  transportMode: TransportMode[];
  heroImage: string;
  stops: RouteStop[];
  whyThisRoute: string;
  tips: string[];
  cautions: string[];
  sourceType: RouteSourceType;
  author?: string;
  status: ContentStatus;
  /** 0–1 editorial confidence for display */
  confidence?: number;
  expectedMood?: string;
  alternativeSlug?: string;
}

export interface Spot {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string;
  category: string;
  vibeTags: string[];
  bestTime: TimeOfDay[];
  priceLevel: BudgetLevel;
  images: string[];
  shortDescription: string;
  bestFor: string[];
  cautionNotes: string[];
  coordinates: { lat: number; lng: number };
  routeRefs: string[];
  crowdRisk: "low" | "medium" | "high";
  photoTone: string;
  nearbyNextStopId?: string;
  routeInclusionNote?: string;
}

export interface GuardianProfileV4 {
  id: string;
  slug: string;
  displayName: string;
  languages: string[];
  specialtyAreas: string[];
  specialtyVibes: string[];
  availability: string;
  avatar: string;
  cover: string;
  shortBio: string;
  trustSignals: string[];
  status: "active" | "limited" | "pause";
}

export type AIPlannerInput = {
  companions: "solo" | "couple" | "friends" | "family";
  timeBudget: "90m" | "half_day" | "full_evening";
  vibe: "calm" | "lively" | "romantic" | "focused";
  budget: "low" | "medium" | "high";
  energy: "light" | "moderate" | "high";
  transport: TransportMode[];
  weatherSensitive: boolean;
  safetySensitive: "low" | "medium" | "high";
  languageComfort: "english" | "korean" | "mixed";
  areaHint?: string;
};

export interface AIPlanOutput {
  id: string;
  userId?: string;
  inputs: AIPlannerInput;
  outputSummary: string;
  routesSuggested: string[];
  rationale: string;
  expectedMood: string;
  timingTips: string[];
  cautions: string[];
  alternativeRouteSlug?: string;
  createdAt: string;
}

export type RequestStatus = "pending" | "accepted" | "declined" | "completed";

export interface GuardianRequestV4 {
  id: string;
  userId?: string;
  guardianId: string;
  routeId?: string;
  requestType: "ask" | "custom_route" | "availability";
  date: string;
  message: string;
  status: RequestStatus;
}

export interface StoryArticleV4 {
  slug: string;
  title: string;
  deck: string;
  coverImage: string;
  readingMinutes: number;
  tags: string[];
  decisionFocus: string;
  bodyParagraphs: string[];
  relatedRouteSlugs: string[];
  status: ContentStatus;
}
