import type { StoryArticleV4 } from "@/domain/curated-experience";

export const V4_STORIES: StoryArticleV4[] = [
  {
    slug: "first-night-seoul-decisions",
    title: "First night in Seoul: fewer decisions, same city",
    deck: "What to optimize on arrival day—and what to deliberately postpone.",
    coverImage: "/images/hero/seoul1_BTS_Sungnyemun.jpg",
    readingMinutes: 6,
    tags: ["arrival", "pacing", "evening"],
    decisionFocus: "Choose one contrast arc (north/south or indoor/outdoor), not three themes.",
    bodyParagraphs: [
      "Arrival day rewards routes that declare an order: anchor, contrast, optional exhale. The mistake is treating night one like a checklist.",
      "If jet lag is high, bias toward wide paths and seated stops after 8pm. Alley charm can wait.",
      "Pair this article with the First night · north to south balance route when you want the sequence pre-built.",
    ],
    relatedRouteSlugs: ["first-night-seoul-north-south"],
    status: "published",
  },
  {
    slug: "quiet-late-date-walk",
    title: "Quiet late walk: when ‘romantic’ means legible",
    deck: "Low crowd risk, clear sightlines, and room to talk without shouting.",
    coverImage: "/images/hero/seoul2_MyLoveFromTheStar_NSeoulTower.jpg",
    readingMinutes: 5,
    tags: ["late night", "pairs", "safety"],
    decisionFocus: "Prioritize predictability over novelty after 10pm.",
    bodyParagraphs: [
      "Night routes for pairs often fail on sensory load, not distance. This guide biases toward tea → browse → river, in that order.",
      "If one of you is noise-sensitive, avoid bar strips between stops—even if the map looks shorter.",
    ],
    relatedRouteSlugs: ["quiet-late-gangnam-corridor"],
    status: "published",
  },
  {
    slug: "solo-traveler-safe-walk-frame",
    title: "Solo walks: a frame for ‘safe enough’",
    deck: "How we label crowd risk, lighting, and exit options—without fear copy.",
    coverImage: "/images/hero/seoul5_NSeoulTower.jpg",
    readingMinutes: 7,
    tags: ["solo", "night", "risk language"],
    decisionFocus: "Use route cards’ caution fields as gates, not fine print.",
    bodyParagraphs: [
      "We separate crowd risk from personal comfort. A ‘low’ crowd stop can still feel intense if you dislike retail buzz.",
      "When in doubt, prefer river segments after dark: fewer blind corners, more horizon.",
    ],
    relatedRouteSlugs: ["quiet-late-gangnam-corridor"],
    status: "published",
  },
  {
    slug: "rainy-day-indoor-spine",
    title: "Rainy day: an indoor spine that still moves",
    deck: "Why bookstores and tea rooms beat mall loops for mood.",
    coverImage: "/images/hero/seoul4_aManWhoLivesWithAKing_Gyeongbokgung.jpg",
    readingMinutes: 4,
    tags: ["rain", "indoor", "pace"],
    decisionFocus: "Keep transitions under 10 minutes of exposed walking.",
    bodyParagraphs: [
      "The goal is continuity without monotony. Alternate seated and browsing postures so the day still feels like travel.",
    ],
    relatedRouteSlugs: ["quiet-late-gangnam-corridor"],
    status: "published",
  },
];

export function getV4StoryBySlug(slug: string): StoryArticleV4 | undefined {
  return V4_STORIES.find((s) => s.slug === slug);
}

export function listPublishedV4Stories(): StoryArticleV4[] {
  return V4_STORIES.filter((s) => s.status === "published");
}
