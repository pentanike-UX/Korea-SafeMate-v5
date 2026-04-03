/**
 * 위키 검색 1순위가 「부산광역시」 등 상위 행정 문서일 때,
 * 스팟명과 무관한 썸네일·요약이 붙는 것을 막기 위한 관련성 판정.
 */

const STOP = new Set([
  "및",
  "등",
  "근처",
  "일대",
  "중심",
  "코스",
  "로드",
  "여행",
  "투어",
  "방문",
  "해변",
  "당일",
]);

/** 넓은 지명만 있을 때는 상위 문서와의 매칭을 허용 */
const BROAD_PLACE = new Set([
  "부산",
  "서울",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "제주",
  "경주",
  "전주",
  "여수",
  "강릉",
  "속초",
  "춘천",
  "포항",
  "창원",
  "수원",
  "성남",
  "한국",
  "대한민국",
]);

function stripAdminSuffix(s: string): string {
  return s.replace(/(특별시|광역시|특별자치시|특별자치도|자치시|자치도)$/u, "");
}

function compact(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "");
}

/** 검색이 자주 끌고 오는 광역·국가 본문(제목 기준) */
function isGenericMetropolitanArticleTitle(title: string): boolean {
  const t = compact(title);
  if (t === "대한민국") return true;
  if (/^제주특별자치도?$/.test(t)) return true;
  if (/^(부산|서울|대구|인천|광주|대전|울산|세종)(광역시|특별시)?$/.test(t)) return true;
  if (/^(부산|서울|대구|인천|광주|대전|울산|세종)시$/.test(t)) return true;
  return false;
}

function spotKeywords(spotName: string, region: string): { all: string[]; specific: string[] } {
  const chunk = `${spotName} ${region}`;
  const parts = chunk
    .split(/[\s·,/]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !STOP.has(p));

  const all = parts
    .map((p) => stripAdminSuffix(p))
    .filter((p) => p.length >= 2 && !STOP.has(p));

  const specific = all.filter((k) => !BROAD_PLACE.has(k));
  return { all, specific };
}

/**
 * 스팟명·권역과 위키 문서 제목·요약 앞부분이 같은 대상을 가리키는지 대략 판별.
 */
export function wikiArticleRelevantToSpot(
  spotName: string,
  region: string,
  articleTitle: string,
  extract: string,
): boolean {
  const titleC = compact(articleTitle);
  const extractHead = compact(extract.slice(0, 720));

  const { all, specific } = spotKeywords(spotName, region);

  const needleInTitleOrHead = (needle: string): boolean => {
    const n = compact(needle);
    if (n.length < 2) return false;
    return titleC.includes(n) || extractHead.includes(n);
  };

  const needleInTitleOnly = (needle: string): boolean => {
    const n = compact(needle);
    if (n.length < 2) return false;
    return titleC.includes(n);
  };

  if (isGenericMetropolitanArticleTitle(articleTitle)) {
    if (specific.length === 0) {
      return all.length > 0 ? all.some(needleInTitleOrHead) : titleC.length >= 2;
    }
    return specific.some(needleInTitleOnly);
  }

  if (specific.length > 0) {
    return specific.some(needleInTitleOrHead);
  }

  if (all.length > 0) {
    return all.some(needleInTitleOrHead);
  }

  const sn = compact(spotName);
  return sn.length >= 2 && (titleC.includes(sn) || extractHead.includes(sn));
}
