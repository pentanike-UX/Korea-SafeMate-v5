/**
 * 플랜 region 문자열 → TourAPI 법정동 필터(lDongRegnCd, lDongSignguCd)
 * 매뉴얼 v4.4 키워드 검색 예시: lDongRegnCd=50 & lDongSignguCd=130 (제주권 시군구 조합).
 * 시군구 3자리는 공식 ldongCode2와 불일치 시 검색 실패로 이어지므로,
 * 확실한 조합만 시군구를 붙이고 그 외는 시도(lDongRegnCd)만 전달합니다.
 */

export type TourLegalDongFilter = {
  lDongRegnCd: string;
  lDongSignguCd?: string;
};

type Entry = { regn: string; signgu?: string };

/** 긴 키워드·구체적 지명 우선 */
const REGION_ENTRIES: { keys: string[]; code: Entry }[] = [
  /** 매뉴얼 예시와 동일 계열(제주 남부권) */
  { keys: ["서귀포시", "서귀포", "중문", "성산", "우도"], code: { regn: "50", signgu: "130" } },
  { keys: ["제주시", "애월", "한림", "협재", "구도심", "칠성로"], code: { regn: "50" } },
  { keys: ["제주특별자치도", "제주도", "제주"], code: { regn: "50" } },
  { keys: ["서울특별시", "서울"], code: { regn: "11" } },
  { keys: ["부산광역시", "부산", "해운대", "광안리", "남포", "감천"], code: { regn: "26" } },
  { keys: ["대구광역시", "대구", "동성로", "동촌"], code: { regn: "27" } },
  { keys: ["인천광역시", "인천"], code: { regn: "28" } },
  { keys: ["광주광역시", "광주"], code: { regn: "29" } },
  { keys: ["대전광역시", "대전"], code: { regn: "30" } },
  { keys: ["울산광역시", "울산"], code: { regn: "31" } },
  { keys: ["세종특별자치시", "세종"], code: { regn: "36" } },
  { keys: ["경기도", "경기", "수원", "가평", "양평", "파주", "용인", "이천", "광교"], code: { regn: "41" } },
  { keys: ["강원특별자치도", "강원도", "강원", "강릉", "속초", "춘천", "평창", "정선"], code: { regn: "51" } },
  { keys: ["충청북도", "충북", "단양"], code: { regn: "43" } },
  { keys: ["충청남도", "충남", "공주", "부여", "백제", "보령", "대천"], code: { regn: "44" } },
  { keys: ["전북특별자치도", "전라북도", "전북", "전주", "한옥마을"], code: { regn: "45" } },
  { keys: ["전라남도", "전남", "여수", "순천"], code: { regn: "46" } },
  { keys: ["경상북도", "경북", "경주", "안동", "포항"], code: { regn: "47" } },
  { keys: ["경상남도", "경남", "통영", "거제"], code: { regn: "48" } },
];

function normalizeRegionText(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * region 예: "제주 · 서귀포", "서울", "경주" → 법정동 코드 추정
 */
export function inferLegalDongFromRegion(region: string): TourLegalDongFilter | null {
  const raw = region.trim();
  if (!raw) return null;
  const compact = normalizeRegionText(raw);
  const spaced = raw.replace(/\s+/g, " ").trim();

  let best: { len: number; code: Entry } | null = null;
  for (const { keys, code } of REGION_ENTRIES) {
    for (const k of keys) {
      const nk = normalizeRegionText(k);
      if (compact.includes(nk) || spaced.includes(k)) {
        const len = k.length;
        if (!best || len > best.len) best = { len, code };
      }
    }
  }

  if (!best) return null;
  const { regn, signgu } = best.code;
  if (signgu) return { lDongRegnCd: regn, lDongSignguCd: signgu };
  return { lDongRegnCd: regn };
}
