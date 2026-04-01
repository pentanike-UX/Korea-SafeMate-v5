import type { CuratedRoute } from "@/domain/curated-experience";
import { FIRST_NIGHT_PATH_SEGMENTS, QUIET_LATE_PATH_SEGMENTS } from "@/data/v4/route-path-segments.generated";

export const V4_ROUTES: CuratedRoute[] = [
  {
    id: "route-quiet-late-gangnam-alt",
    slug: "quiet-late-gangnam-corridor",
    title: "Quiet late corridor · Gangnam edge",
    summary: "Tea → browse → river walk, sequenced for low noise after dark.",
    subtitle: "Tea, shelves, then open river—sequenced for low noise.",
    city: "Seoul",
    district: "Gangnam–Seocho",
    vibeTags: ["calm", "late", "solo-safe"],
    bestFor: ["solo travelers", "pairs needing reset", "low verbal energy"],
    timeOfDay: ["evening", "late_night"],
    durationMinutes: 165,
    budgetLevel: 2,
    transportMode: ["walk", "transit"],
    heroImage: "/images/hero/seoul2_MyLoveFromTheStar_NSeoulTower.jpg",
    pathSegments: QUIET_LATE_PATH_SEGMENTS,
    stops: [
      {
        id: "rs-1",
        spotId: "spot-teahouse-itaewon",
        order: 1,
        stayMinutes: 35,
        transitionHint: "Walk 12 min · mostly lit arterials",
        whyHere: "Establishes tempo: seated, warm, bounded—before any elevation.",
      },
      {
        id: "rs-2",
        spotId: "spot-bookstore-hannam",
        order: 2,
        stayMinutes: 40,
        transitionHint: "Shuttle feeling: indoor browse, no reservation",
        whyHere: "Keeps stimulation structured; easy exit if fatigue spikes.",
      },
      {
        id: "rs-3",
        spotId: "spot-river-banpo",
        order: 3,
        stayMinutes: 50,
        transitionHint: "Descend to river level · wide paths",
        whyHere: "Motion without wayfinding stress; visibility for solo comfort.",
      },
    ],
    whyThisRoute:
      "Orders experience from enclosed calm → structured browse → open movement. Reduces ‘where next?’ moments that spike anxiety after 9pm.",
    tips: ["Start within 90 minutes of sunset for the light handoff.", "Keep transit to one line change max after stop 2."],
    cautions: ["Friday nights near Itaewon station can crowd—bypass main bar strips."],
    sourceType: "editorial",
    author: "Route desk",
    status: "published",
    confidence: 0.86,
    expectedMood: "Unhurried, slightly cinematic",
    alternativeSlug: "first-night-seoul-north-south",
  },
  {
    id: "route-first-night-seoul",
    slug: "first-night-seoul-north-south",
    title: "First night · north to south balance",
    summary: "Craft row calm, then tea, optional river exhale—arrival-day pacing.",
    subtitle: "Landmark-adjacent without queue chasing.",
    city: "Seoul",
    district: "Jongno–Yongsan",
    vibeTags: ["first visit", "balanced pace", "orientation"],
    bestFor: ["first-timers", "families", "jet lag"],
    timeOfDay: ["evening"],
    durationMinutes: 140,
    budgetLevel: 3,
    transportMode: ["walk", "mixed"],
    heroImage: "/images/hero/seoul1_BTS_Sungnyemun.jpg",
    pathSegments: FIRST_NIGHT_PATH_SEGMENTS,
    stops: [
      {
        id: "rs-f1",
        spotId: "spot-gwang-craft",
        order: 1,
        stayMinutes: 45,
        transitionHint: "Stay on main walking spine",
        whyHere: "Gives cultural texture without a full palace visit—shorter commitment window.",
      },
      {
        id: "rs-f2",
        spotId: "spot-teahouse-itaewon",
        order: 2,
        stayMinutes: 40,
        transitionHint: "Cross-town · one transfer",
        whyHere: "Deliberate contrast: craft daylight energy → seated evening calm.",
      },
      {
        id: "rs-f3",
        spotId: "spot-river-banpo",
        order: 3,
        stayMinutes: 45,
        transitionHint: "Optional shorten: end at stop 2 if tired",
        whyHere: "Optional exhale; skip if mobility is low—route still resolves at stop 2.",
      },
    ],
    whyThisRoute:
      "Balances orientation (readable landmarks) with a clear wind-down. Designed for decision fatigue on arrival day.",
    tips: ["If rain, swap stop 3 for extended stop 2.", "Carry light cash for small craft counters."],
    cautions: ["Palace-adjacent crowds on holiday evenings—add 15 minutes buffer."],
    sourceType: "guardian",
    author: "Minseo · guardian",
    status: "published",
    confidence: 0.78,
    expectedMood: "Grounded, gently curious",
    alternativeSlug: "quiet-late-gangnam-corridor",
  },
];

export function getV4RouteBySlug(slug: string): CuratedRoute | undefined {
  return V4_ROUTES.find((r) => r.slug === slug);
}

export function getV4RouteById(id: string): CuratedRoute | undefined {
  return V4_ROUTES.find((r) => r.id === id);
}

export function listPublishedV4Routes(): CuratedRoute[] {
  return V4_ROUTES.filter((r) => r.status === "published");
}
