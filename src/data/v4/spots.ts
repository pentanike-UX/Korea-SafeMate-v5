import type { Spot } from "@/domain/curated-experience";

export const V4_SPOTS: Spot[] = [
  {
    id: "spot-teahouse-itaewon",
    slug: "still-teahouse-itaewon-hill",
    name: "Still Teahouse · Itaewon ridge",
    city: "Seoul",
    district: "Yongsan",
    category: "Tea · pause",
    vibeTags: ["quiet", "warm light", "solo-friendly"],
    bestTime: ["afternoon", "evening"],
    priceLevel: 2,
    images: ["/images/hero/seoul3_Dokebi_Gamgodang-gil.jpg"],
    shortDescription:
      "A breathing stop before the slope. Low conversation, clear sightlines—useful when you want calm without leaving the city grid.",
    bestFor: ["solo", "pairs", "low sensory load"],
    cautionNotes: ["Steep approach in wet weather; allow +8 minutes."],
    coordinates: { lat: 37.5341, lng: 126.9944 },
    routeRefs: ["quiet-late-gangnam-corridor", "first-night-seoul-north-south"],
    crowdRisk: "low",
    photoTone: "Warm interior, soft contrast",
    nearbyNextStopId: "spot-bookstore-hannam",
    routeInclusionNote: "Anchors the emotional downshift between transit noise and the ridge walk.",
  },
  {
    id: "spot-bookstore-hannam",
    slug: "depth-books-hannam",
    name: "Depth Books · Hannam",
    city: "Seoul",
    district: "Yongsan",
    category: "Bookstore · browse",
    vibeTags: ["editorial", "slow browse", "rainy-day"],
    bestTime: ["afternoon", "evening"],
    priceLevel: 2,
    images: ["/images/hero/seoul4_aManWhoLivesWithAKing_Gyeongbokgung.jpg"],
    shortDescription:
      "Structured wandering: shelves as pacing, not shopping. Good when you need a socially acceptable reason to be alone indoors.",
    bestFor: ["introverts", "rain plans", "short resets"],
    cautionNotes: ["Weekend afternoons can queue at the café counter."],
    coordinates: { lat: 37.5365, lng: 126.998 },
    routeRefs: ["quiet-late-gangnam-corridor"],
    crowdRisk: "medium",
    photoTone: "Neutral paper whites, ink blacks",
    nearbyNextStopId: "spot-river-banpo",
    routeInclusionNote: "Bridges teahouse calm to open sky without a jarring scene change.",
  },
  {
    id: "spot-river-banpo",
    slug: "banpo-river-walk-south",
    name: "Banpo river walk · south bank",
    city: "Seoul",
    district: "Seocho",
    category: "Walk · open air",
    vibeTags: ["open sky", "movement", "safe night walk"],
    bestTime: ["evening", "late_night"],
    priceLevel: 1,
    images: ["/images/hero/seoul5_NSeoulTower.jpg"],
    shortDescription:
      "Wide paths, even lighting, predictable traffic. The route uses this segment when you want motion with low decision density.",
    bestFor: ["solo night", "jet-lag legs", "clear headspace"],
    cautionNotes: ["Wind picks up along the water—layer lightly."],
    coordinates: { lat: 37.508, lng: 127.0 },
    routeRefs: ["quiet-late-gangnam-corridor"],
    crowdRisk: "low",
    photoTone: "Cool ambient, long reflections",
    routeInclusionNote: "Provides legibility at night: fewer alleys, more horizon.",
  },
  {
    id: "spot-gwang-craft",
    slug: "gwanghwamun-craft-row",
    name: "Gwanghwamun craft row",
    city: "Seoul",
    district: "Jongno",
    category: "Craft · small retail",
    vibeTags: ["hands-on", "daylight", "culture-light"],
    bestTime: ["morning", "afternoon"],
    priceLevel: 3,
    images: ["/images/hero/seoul6_BTS_Gwanghwamun.jpg"],
    shortDescription:
      "Short stops with visible process—pottery, paper, small objects. Keeps engagement high without museum fatigue.",
    bestFor: ["families", "first-timers", "tactile learners"],
    cautionNotes: ["Some ateliers require reservation after 4pm."],
    coordinates: { lat: 37.576, lng: 126.977 },
    routeRefs: ["first-night-seoul-north-south"],
    crowdRisk: "high",
    photoTone: "Bright daylight, crisp shadows",
    routeInclusionNote: "Offers a north–south contrast to southern ridge calm in the same evening arc.",
  },
];

export function getV4SpotBySlug(slug: string): Spot | undefined {
  return V4_SPOTS.find((s) => s.slug === slug);
}

export function getV4SpotById(id: string): Spot | undefined {
  return V4_SPOTS.find((s) => s.id === id);
}
