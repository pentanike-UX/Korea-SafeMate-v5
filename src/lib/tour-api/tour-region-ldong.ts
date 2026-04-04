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

/**
 * 긴 키워드·구체적 지명 우선.
 * 시군구 코드(signgu)가 있으면 TourAPI 검색 범위가 좁아져 정확도가 올라갑니다.
 * 코드 출처: 공공데이터포털 법정동코드 / TourAPI 매뉴얼 v4.4 예시.
 */
const REGION_ENTRIES: { keys: string[]; code: Entry }[] = [
  // ── 제주 ──
  { keys: ["서귀포시", "서귀포", "중문", "성산", "우도"], code: { regn: "50", signgu: "130" } },
  { keys: ["제주시", "애월", "한림", "협재", "구도심", "칠성로"], code: { regn: "50", signgu: "110" } },
  { keys: ["제주특별자치도", "제주도", "제주"], code: { regn: "50" } },

  // ── 서울 ── (구 단위는 넓으므로 시도만)
  { keys: ["서울특별시", "서울"], code: { regn: "11" } },

  // ── 부산 ──
  { keys: ["해운대", "광안리"], code: { regn: "26", signgu: "350" } },
  { keys: ["남포", "자갈치", "BIFF광장", "국제시장"], code: { regn: "26", signgu: "290" } },
  { keys: ["감천", "감천문화마을"], code: { regn: "26", signgu: "530" } },
  { keys: ["부산광역시", "부산"], code: { regn: "26" } },

  // ── 대구 ──
  { keys: ["대구광역시", "대구", "동성로", "동촌"], code: { regn: "27" } },

  // ── 인천 ──
  { keys: ["강화", "강화도"], code: { regn: "28", signgu: "710" } },
  { keys: ["인천광역시", "인천"], code: { regn: "28" } },

  // ── 광주 ──
  { keys: ["광주광역시", "광주"], code: { regn: "29" } },

  // ── 대전 ──
  { keys: ["대전광역시", "대전"], code: { regn: "30" } },

  // ── 울산 ──
  { keys: ["울산광역시", "울산"], code: { regn: "31" } },

  // ── 세종 ──
  { keys: ["세종특별자치시", "세종"], code: { regn: "36" } },

  // ── 경기도 (시군구 분리) ──
  { keys: ["수원", "광교", "수원화성"], code: { regn: "41", signgu: "110" } },
  { keys: ["가평", "자라섬"], code: { regn: "41", signgu: "820" } },
  { keys: ["양평"], code: { regn: "41", signgu: "830" } },
  { keys: ["파주", "임진각", "헤이리"], code: { regn: "41", signgu: "380" } },
  { keys: ["용인", "에버랜드"], code: { regn: "41", signgu: "460" } },
  { keys: ["이천"], code: { regn: "41", signgu: "500" } },
  { keys: ["여주"], code: { regn: "41", signgu: "670" } },
  { keys: ["포천"], code: { regn: "41", signgu: "650" } },
  { keys: ["경기도", "경기"], code: { regn: "41" } },

  // ── 강원도 (시군구 분리) ──
  { keys: ["강릉"], code: { regn: "51", signgu: "150" } },
  { keys: ["속초"], code: { regn: "51", signgu: "210" } },
  { keys: ["춘천"], code: { regn: "51", signgu: "110" } },
  { keys: ["평창", "대관령"], code: { regn: "51", signgu: "750" } },
  { keys: ["정선"], code: { regn: "51", signgu: "770" } },
  { keys: ["양양", "서피비치", "낙산"], code: { regn: "51", signgu: "830" } },
  { keys: ["인제", "설악산"], code: { regn: "51", signgu: "810" } },
  { keys: ["영월"], code: { regn: "51", signgu: "730" } },
  { keys: ["동해", "묵호"], code: { regn: "51", signgu: "170" } },
  { keys: ["삼척"], code: { regn: "51", signgu: "230" } },
  { keys: ["강원특별자치도", "강원도", "강원"], code: { regn: "51" } },

  // ── 충북 ──
  { keys: ["단양", "도담삼봉"], code: { regn: "43", signgu: "800" } },
  { keys: ["제천"], code: { regn: "43", signgu: "150" } },
  { keys: ["충주"], code: { regn: "43", signgu: "130" } },
  { keys: ["충청북도", "충북"], code: { regn: "43" } },

  // ── 충남 ──
  { keys: ["공주", "공산성"], code: { regn: "44", signgu: "150" } },
  { keys: ["부여", "백제"], code: { regn: "44", signgu: "760" } },
  { keys: ["보령", "대천"], code: { regn: "44", signgu: "180" } },
  { keys: ["태안"], code: { regn: "44", signgu: "825" } },
  { keys: ["서산"], code: { regn: "44", signgu: "210" } },
  { keys: ["충청남도", "충남"], code: { regn: "44" } },

  // ── 전북 ──
  { keys: ["전주", "한옥마을"], code: { regn: "45", signgu: "130" } },
  { keys: ["군산", "근대문화도시"], code: { regn: "45", signgu: "140" } },
  { keys: ["남원"], code: { regn: "45", signgu: "190" } },
  { keys: ["무주", "덕유산"], code: { regn: "45", signgu: "730" } },
  { keys: ["전북특별자치도", "전라북도", "전북"], code: { regn: "45" } },

  // ── 전남 ──
  { keys: ["여수"], code: { regn: "46", signgu: "130" } },
  { keys: ["순천", "순천만"], code: { regn: "46", signgu: "150" } },
  { keys: ["담양", "죽녹원"], code: { regn: "46", signgu: "710" } },
  { keys: ["목포"], code: { regn: "46", signgu: "110" } },
  { keys: ["완도"], code: { regn: "46", signgu: "830" } },
  { keys: ["해남", "땅끝마을"], code: { regn: "46", signgu: "820" } },
  { keys: ["전라남도", "전남"], code: { regn: "46" } },

  // ── 경북 ──
  { keys: ["경주", "불국사", "첨성대", "황리단길"], code: { regn: "47", signgu: "130" } },
  { keys: ["안동", "하회마을"], code: { regn: "47", signgu: "170" } },
  { keys: ["포항", "호미곶"], code: { regn: "47", signgu: "110" } },
  { keys: ["영덕", "블루로드"], code: { regn: "47", signgu: "770" } },
  { keys: ["울릉", "울릉도"], code: { regn: "47", signgu: "900" } },
  { keys: ["경상북도", "경북"], code: { regn: "47" } },

  // ── 경남 ──
  { keys: ["통영", "한산도"], code: { regn: "48", signgu: "220" } },
  { keys: ["거제", "거제도"], code: { regn: "48", signgu: "310" } },
  { keys: ["남해"], code: { regn: "48", signgu: "840" } },
  { keys: ["하동", "쌍계사"], code: { regn: "48", signgu: "850" } },
  { keys: ["진주"], code: { regn: "48", signgu: "170" } },
  { keys: ["경상남도", "경남"], code: { regn: "48" } },
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
