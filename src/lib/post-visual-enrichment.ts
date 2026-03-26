import type { ContentPost, RouteSpot } from "@/types/domain";

/**
 * Curated Unsplash stills (license: https://unsplash.com/license) — stable photo IDs, `w` for CDN sizing.
 * Replace with self-hosted `/public/...` URLs in production if desired; mapping logic stays the same.
 */
function u(photoPath: string, w = 1400) {
  return `https://images.unsplash.com/${photoPath}?w=${w}&q=82`;
}

export const ENRICHMENT_FALLBACK_BY_REGION: Record<string, { hero: string; alt: string }> = {
  seoul: {
    hero: u("photo-1538485399081-7191377e8241"),
    alt: "서울 도심 스카이라인과 한강",
  },
  busan: {
    hero: u("photo-1596422840783-7124f7369a1f"),
    alt: "부산 해안과 도시 풍경",
  },
  jeju: {
    hero: u("photo-1476514525535-07fb3b4ae5f1"),
    alt: "제주 바다와 해안 풍경",
  },
};

const DEFAULT_FALLBACK = {
  hero: u("photo-1517154421773-0529f29ea451"),
  alt: "한국 도시 광장과 산책로",
};

type VisualRule = {
  id: string;
  terms: string[];
  weight: number;
  hero: string;
  secondary?: string;
  alt: string;
  altSecondary?: string;
};

/** Higher weight + more term hits win. Multi-term rules are checked with bonus for full match. */
const RULES: VisualRule[] = [
  {
    id: "gwanghwamun_full",
    terms: ["광화문", "경복궁", "이순신", "세종대왕", "세종로", "광장"],
    weight: 14,
    hero: u("photo-1590559899731-a382839554ff"),
    secondary: u("photo-1583839729043-783a4d1fe361"),
    alt: "광화문·도심 광장과 전통 건축",
    altSecondary: "경복궁 전각과 담장",
  },
  {
    id: "gwanghwamun_core",
    terms: ["광화문", "경복궁"],
    weight: 18,
    hero: u("photo-1590559899731-a382839554ff"),
    secondary: u("photo-1583839729043-783a4d1fe361"),
    alt: "광화문 일대 랜드마크",
    altSecondary: "궁궐 담장과 산책로",
  },
  {
    id: "sejong_statue",
    terms: ["세종대왕", "세종로", "세종"],
    weight: 15,
    hero: u("photo-1517154421773-0529f29ea451"),
    secondary: u("photo-1578469550956-0b16cdfdb495"),
    alt: "광화문광장과 넓은 산책 공간",
    altSecondary: "도심 조형물과 광장",
  },
  {
    id: "yi_sunshin",
    terms: ["이순신"],
    weight: 14,
    hero: u("photo-1578469550956-0b16cdfdb495"),
    secondary: u("photo-1590559899731-a382839554ff"),
    alt: "광장의 기준점이 되는 동상과 도심",
    altSecondary: "광화문 방향 전경",
  },
  {
    id: "gangnam_cafe",
    terms: ["강남", "카페"],
    weight: 22,
    hero: u("photo-1554118811-1e0d58224f24"),
    secondary: u("photo-1495474472287-71871a1f22fe"),
    alt: "강남 일대 카페 외관",
    altSecondary: "카페 실내 좌석과 분위기",
  },
  {
    id: "gangnam_street",
    terms: ["강남역", "강남", "테헤란로"],
    weight: 16,
    hero: u("photo-1548115184-bc6547d06a58"),
    secondary: u("photo-1512486130939-2c4f79635e84"),
    alt: "강남 도심 거리와 보행로",
    altSecondary: "강남 야경과 네온",
  },
  {
    id: "cafe_general",
    terms: ["카페", "커피", "브런치"],
    weight: 11,
    hero: u("photo-1554118811-1e0d58224f24"),
    secondary: u("photo-1495474472287-71871a1f22fe"),
    alt: "카페 외부 파사드",
    altSecondary: "카페 내부 좌석",
  },
  {
    id: "night_city",
    terms: ["야경", "야간", "밤", "네온"],
    weight: 10,
    hero: u("photo-1512486130939-2c4f79635e84"),
    secondary: u("photo-1548115184-bc6547d06a58"),
    alt: "도심 야경",
    altSecondary: "밤 거리 흐름",
  },
  {
    id: "han_river",
    terms: ["한강"],
    weight: 13,
    hero: u("photo-1507525428034-b723cf961d3e"),
    secondary: u("photo-1519046904887-71707b70f783"),
    alt: "한강 공원과 산책로",
    altSecondary: "강변 휴식 공간",
  },
  {
    id: "haeundae",
    terms: ["해운대", "부산"],
    weight: 12,
    hero: u("photo-1596422840783-7124f7369a1f"),
    secondary: u("photo-1559827260-dc66d52bef19"),
    alt: "부산 해안과 보행로",
    altSecondary: "해변가 산책",
  },
  {
    id: "market",
    terms: ["시장", "전통시장", "먹거리"],
    weight: 10,
    hero: u("photo-1555939594-58d7cb561ad1"),
    secondary: u("photo-1563013544-824ae1b704d3"),
    alt: "전통 시장과 먹거리 코너",
    altSecondary: "시장 통로",
  },
  {
    id: "subway",
    terms: ["지하철", "환승", "역"],
    weight: 9,
    hero: u("photo-1548115184-bc6547d06a58"),
    secondary: u("photo-1469854523086-cc02fe5d8800"),
    alt: "도시 보행과 접근",
    altSecondary: "통로와 이동 동선",
  },
  {
    id: "bukchon_alley",
    terms: ["북촌", "골목", "한옥"],
    weight: 12,
    hero: u("photo-1566988102596-43bb7b84db8f"),
    secondary: u("photo-1583839729043-783a4d1fe361"),
    alt: "골목과 보행로",
    altSecondary: "전통 건축과 담장",
  },
  {
    id: "shopping_tax",
    terms: ["면세", "환급", "쇼핑"],
    weight: 9,
    hero: u("photo-1441986300917-64674bd600d8"),
    secondary: u("photo-1604719314756-9048b615390b"),
    alt: "쇼핑 공간과 동선",
    altSecondary: "매장·아케이드 내부",
  },
  {
    id: "rain_indoor",
    terms: ["우천", "비 오는", "실내"],
    weight: 9,
    hero: u("photo-1501339849922-c21129a094ea"),
    secondary: u("photo-1495474472287-71871a1f22fe"),
    alt: "창가와 실내 휴식",
    altSecondary: "카페 실내",
  },
];

function buildHaystack(post: ContentPost): string {
  const parts = [
    post.title,
    post.summary,
    post.body,
    post.tags.join(" "),
    post.region_slug,
    post.category_slug,
    post.kind,
  ];
  if (post.route_journey?.spots.length) {
    for (const s of post.route_journey.spots) {
      parts.push(
        s.title,
        s.place_name,
        s.address_line ?? "",
        s.short_description,
        s.body,
        s.recommend_reason,
      );
    }
  }
  return parts.join(" ").toLowerCase();
}

function scoreRule(haystack: string, rule: VisualRule): number {
  const matched = rule.terms.filter((t) => haystack.includes(t.toLowerCase()));
  if (matched.length === 0) return 0;
  const fullBonus = matched.length === rule.terms.length ? 6 : 0;
  return rule.weight * matched.length + fullBonus;
}

export type EnrichedPostVisual = {
  heroUrl: string;
  secondaryUrl?: string;
  alt: string;
  altSecondary?: string;
  ruleId: string;
};

export function resolveEnrichedPostVisuals(post: ContentPost): EnrichedPostVisual {
  const haystack = buildHaystack(post);
  let best: { rule: VisualRule; score: number } | null = null;
  for (const rule of RULES) {
    const s = scoreRule(haystack, rule);
    if (s <= 0) continue;
    if (!best || s > best.score) best = { rule, score: s };
  }
  if (best) {
    return {
      heroUrl: best.rule.hero,
      secondaryUrl: best.rule.secondary,
      alt: best.rule.alt,
      altSecondary: best.rule.altSecondary,
      ruleId: best.rule.id,
    };
  }
  const fb = ENRICHMENT_FALLBACK_BY_REGION[post.region_slug] ?? DEFAULT_FALLBACK;
  return {
    heroUrl: fb.hero,
    alt: fb.alt,
    ruleId: `region:${post.region_slug}`,
  };
}

function spotHaystack(spot: RouteSpot, post: ContentPost): string {
  return [
    spot.title,
    spot.place_name,
    spot.address_line ?? "",
    spot.short_description,
    spot.body,
    post.title,
    post.summary,
    post.tags.join(" "),
    post.region_slug,
  ]
    .join(" ")
    .toLowerCase();
}

/** When a route spot has no uploads, pick a still aligned with spot + post text. */
export function resolveEnrichedSpotVisual(spot: RouteSpot, post: ContentPost): EnrichedPostVisual {
  const haystack = spotHaystack(spot, post);
  let best: { rule: VisualRule; score: number } | null = null;
  for (const rule of RULES) {
    const s = scoreRule(haystack, rule);
    if (s <= 0) continue;
    if (!best || s > best.score) best = { rule, score: s };
  }
  if (best) {
    return {
      heroUrl: best.rule.hero,
      secondaryUrl: best.rule.secondary,
      alt: `${spot.place_name} — ${best.rule.alt}`,
      altSecondary: best.rule.altSecondary,
      ruleId: best.rule.id,
    };
  }
  const fb = ENRICHMENT_FALLBACK_BY_REGION[post.region_slug] ?? DEFAULT_FALLBACK;
  return {
    heroUrl: fb.hero,
    alt: `${spot.place_name} — ${fb.alt}`,
    ruleId: `region:${post.region_slug}`,
  };
}
