/** 광역 → 시·군·구(클러스터) → 동네(선택) */

export const REGIONS: Record<string, Record<string, string[]>> = {
  서울: {
    "종로·중구": ["경복궁·광화문", "익선동·낙원동", "을지로·명동"],
    "마포·홍대": ["홍대입구", "연남동", "합정·망원", "상수"],
    "강남·서초": ["강남역", "신사·가로수길", "압구정·청담"],
    "용산·이태원": ["이태원", "한남동", "경리단길"],
    "성동·성수": ["성수동", "뚝섬"],
    "노원·도봉": ["북한산", "수락산"],
  },
  부산: {
    "해운대·수영": ["해운대", "광안리", "센텀"],
    "중구·동구": ["남포동·국제시장", "초량", "부산역"],
    "서구·사하": ["송도해수욕장", "암남공원"],
    기장군: ["기장읍", "일광해수욕장"],
  },
  제주: {
    제주시: ["구도심·칠성로", "애월", "한림"],
    서귀포시: ["서귀포 구도심", "중문", "성산·우도"],
    동부: ["성산일출봉", "표선"],
    서부: ["한경면", "대정읍"],
  },
  경기도: {
    "수원·화성": ["수원 화성", "광교"],
    "가평·양평": ["가평", "양평"],
    파주: ["헤이리", "프로방스"],
    "용인·이천": ["에버랜드", "이천 도예촌"],
  },
  강원도: {
    "강릉·속초": ["강릉 시내", "안목해변", "속초 해변"],
    "평창·정선": ["대관령", "정선 아리랑"],
    춘천: ["의암호", "닭갈비골목"],
  },
  경상도: {
    경주: ["불국사·석굴암", "황리단길", "동궁과월지"],
    안동: ["하회마을", "안동 구도심"],
    "통영·거제": ["통영 구도심", "거제 해금강"],
  },
  전라도: {
    전주: ["한옥마을", "객리단길"],
    여수: ["여수 밤바다", "돌산도"],
    순천: ["순천만 습지", "낙안읍성"],
  },
  충청도: {
    "공주·부여": ["공산성", "백제문화단지"],
    보령: ["대천해수욕장"],
    단양: ["단양 구경시장", "만천하스카이워크"],
  },
};

export type RegionPick = {
  level1: string | null;
  level2: string | null;
  level3: string | null;
};

export const LEVEL1_OPTIONS = Object.keys(REGIONS);

/** 칩 표시: 동네 있으면 `광역 · 동네`, 없으면 `광역 · 시군구` */
export function formatRegionDisplay(p: RegionPick): string {
  const { level1: l1, level2: l2, level3: l3 } = p;
  if (!l1) return "";
  if (l3) return `${l1} · ${l3}`;
  if (l2) return `${l1} · ${l2}`;
  return l1;
}

export function parseRegionDraft(display: string): RegionPick {
  const t = display.trim();
  if (!t) return { level1: null, level2: null, level3: null };
  if (REGIONS[t]) return { level1: t, level2: null, level3: null };
  const sep = " · ";
  const idx = t.indexOf(sep);
  const l1 = idx === -1 ? t : t.slice(0, idx).trim();
  if (!l1 || !REGIONS[l1]) return { level1: null, level2: null, level3: null };
  if (idx === -1) return { level1: l1, level2: null, level3: null };
  const restJoined = t.slice(idx + sep.length).trim();
  if (!restJoined) return { level1: l1, level2: null, level3: null };
  const l2keys = Object.keys(REGIONS[l1]!);
  for (const l2 of l2keys) {
    const n3 = REGIONS[l1]![l2]!;
    if (n3.includes(restJoined)) return { level1: l1, level2: l2, level3: restJoined };
  }
  for (const l2 of l2keys) {
    if (l2 === restJoined) return { level1: l1, level2: l2, level3: null };
  }
  for (const l2 of l2keys) {
    const n3 = REGIONS[l1]![l2]!;
    for (const n of n3) {
      if (n === restJoined) return { level1: l1, level2: l2, level3: n };
    }
  }
  return { level1: l1, level2: null, level3: null };
}

/** 구역·코스 칩 상단 제안 (키워드 + 클러스터 맵) */
const ZONE_HINTS_BY_L2: Record<string, string[]> = {
  "종로·중구": ["경복궁·광화문 루트", "익선·낙원 골목"],
  "마포·홍대": ["홍대 골목", "연남동 카페거리", "합정·망원 산책"],
  "강남·서초": ["강남역 일대", "가로수길·신사", "압구정·청담"],
  "용산·이태원": ["이태원 골목", "한남·경리단"],
  "성동·성수": ["성수 연무장길", "뚝섬 한강"],
  "해운대·수영": ["해운대 해변", "광안리 야경", "센텀시티"],
  "중구·동구": ["남포·국제시장", "부산역·초량"],
  제주시: ["구도심·칠성로", "애월 드라이브", "한림·협재"],
  서귀포시: ["중문·쇠소깍", "성산·우도"],
  경주: ["황리단길", "불국사·석굴암"],
  전주: ["한옥마을", "객리단길"],
  여수: ["여수 밤바다", "돌산 케이블카"],
};

const ZONE_HINTS_BY_L1: Record<string, string[]> = {
  서울: ["한강 산책", "시내·다운타운 한가운데"],
  부산: ["해변·바다·산책로", "전통시장·먹거리 골목"],
  제주: ["해안 드라이브", "오름·숲 산책"],
  경기도: ["레저·테마파크", "계곡·힐링"],
  강원도: ["바다·해변", "산·트레킹"],
  경상도: ["유적·문화 산책", "포구·섬 풍경"],
  전라도: ["한옥·골목", "밤바다·해안"],
  충청도: ["역사 유적", "자연·계곡"],
};

export function getZoneSuggestionsForRegion(regionDisplay: string): string[] {
  const p = parseRegionDraft(regionDisplay);
  const out: string[] = [];
  if (p.level2 && ZONE_HINTS_BY_L2[p.level2]) {
    out.push(...ZONE_HINTS_BY_L2[p.level2]!);
  }
  if (p.level1 && ZONE_HINTS_BY_L1[p.level1]) {
    out.push(...ZONE_HINTS_BY_L1[p.level1]!);
  }
  return [...new Set(out)];
}
