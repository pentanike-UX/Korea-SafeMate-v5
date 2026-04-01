import type { GuardianProfileV4 } from "@/domain/curated-experience";

export const V4_GUARDIANS: GuardianProfileV4[] = [
  {
    id: "g-v4-minseo",
    slug: "minseo",
    displayName: "Minseo",
    languages: ["Korean", "English"],
    specialtyAreas: ["Jongno", "Yongsan", "Seocho"],
    specialtyVibes: ["first night", "families", "rainy-day pivots"],
    availability: "Replies within ~6h · evenings KST",
    avatar: "/images/hero/seoul3_Dokebi_Gamgodang-gil.jpg",
    cover: "/images/hero/seoul6_BTS_Gwanghwamun.jpg",
    shortBio:
      "Sequences evenings for people who want fewer forks in the road. Prefers written briefs before calls.",
    trustSignals: ["Editorial route co-author", "120+ fulfilled requests", "Bilingual briefs"],
    status: "active",
  },
  {
    id: "g-v4-jun",
    slug: "jun",
    displayName: "Jun",
    languages: ["Korean", "English", "Japanese"],
    specialtyAreas: ["Gangnam", "Songpa"],
    specialtyVibes: ["late night", "solo", "low-sensory"],
    availability: "Weekends + late slots",
    avatar: "/images/hero/seoul5_NSeoulTower.jpg",
    cover: "/images/hero/seoul2_MyLoveFromTheStar_NSeoulTower.jpg",
    shortBio:
      "Focuses on safe night corridors and transit minimization. Good when maps feel louder than the city.",
    trustSignals: ["Night-route specialist", "Transit stress mapping", "4.9 avg clarity score"],
    status: "active",
  },
];

export function getV4GuardianBySlug(slug: string): GuardianProfileV4 | undefined {
  return V4_GUARDIANS.find((g) => g.slug === slug);
}
