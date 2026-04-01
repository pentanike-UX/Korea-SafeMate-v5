import type { ServiceTypeCode } from "@/types/domain";

export const BRAND = {
  name: "SafeMate",
  tagline: "Sequences that fit the moment—not another place list.",
  description:
    "SafeMate is an AI-assisted local movement curator for Korea: ordered routes, timing context, and guardian-backed judgment when you want a second pair of eyes.",
} as const;

export const PRODUCT_LAYERS = [
  {
    title: "Local travel intelligence",
    body: "Region-scoped tips, hot places, and practical arrival mechanics — vivid and specific, moderated for quality.",
  },
  {
    title: "Guardian community & reputation",
    body: "Open contribution with tier rules; activity and mutual reviews build trust signals separate from matching eligibility.",
  },
  {
    title: "Safe companion matching",
    body: "Verified Guardians only after review + policy checks; early coordination uses external chat handoff — no full in-app chat MVP.",
  },
] as const;

export const CONTRIBUTION_RULES = {
  activeGuardianRolling30d: 12,
  activeGuardianMinPerWeek: 3,
  windowDays: 30,
  weekDays: 7,
} as const;

export const SERVICE_SCOPE = {
  included: [
    "Curated local intel and moderated posts by region",
    "Guardian reputation from contribution + mutual reviews",
    "Practical companion sessions with clear scope (arrival, routes, first hours)",
    "External chat handoff (Telegram, KakaoTalk, WhatsApp, etc.) once matched",
  ],
  excluded: [
    "Generic brochure marketing or unmoderated forum chaos",
    "Automatic matching privileges from post volume alone",
    "Medical, legal, or emergency response claims",
    "First-party real-time chat platform (MVP uses external channels)",
  ],
} as const;

export const NAV_MAIN = [
  { href: "/explore/routes", label: "Explore" },
  { href: "/planner", label: "AI Planner" },
  { href: "/guardians", label: "Guardians" },
  { href: "/stories", label: "Stories" },
  { href: "/safety", label: "Safety" },
] as const;

/** Canonical entry paths for web now; mirror in a future app for the same flows (trust → first conversion → retention). */
export const PRODUCT_ENTRY_ROUTES = {
  book: "/book",
  explore: "/explore",
  services: "/services",
  guardianApply: "/guardians/apply",
  login: "/login",
} as const;

export const SERVICE_COPY: Record<
  ServiceTypeCode,
  { title: string; bullets: string[] }
> = {
  arrival: {
    title: "Arrival Companion",
    bullets: [
      "Airport or major station to your stay",
      "T-money / SIM basics and first navigation",
      "Check-in support and simple local setup",
    ],
  },
  k_route: {
    title: "K-Route Companion",
    bullets: [
      "Visit K-content related spots you already chose",
      "Route execution: tickets, queues, ordering, directions",
      "Practical help — not scripted tourism commentary",
    ],
  },
  first_24h: {
    title: "First 24 Hours",
    bullets: [
      "First-day adaptation in Korea",
      "Apps, transit, food ordering basics",
      "Settling-in support with realistic scope",
    ],
  },
};

export const CONTACT_CHANNEL_LABELS = {
  telegram: "Telegram",
  kakao: "KakaoTalk",
  whatsapp: "WhatsApp",
  line: "LINE",
  email: "Email",
  other: "Other",
} as const;
