"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import {
  Plus, MapPin, Clock, CloudSun, Bookmark, BookmarkCheck,
  Send, Utensils, Coffee, Train, Camera, ChevronRight,
  Sparkles, MoreHorizontal, Trash2, PanelLeftClose, PanelLeft,
  Navigation, Hotel, Menu, X, Map, Compass, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  loadConversations, createConversation, updateConversationTitle,
  deleteConversation as dbDeleteConversation, loadMessages, saveMessage,
  loadSavedPlans, savePlanToDB,
  type DBConversation, type DBMessage, type DBSavedPlan,
} from "@/lib/v5/chat-persistence";
import { V5PlanMapModal } from "./v5-plan-map-modal";
import { consumeTravelChatSse } from "@/lib/travel-chat/consume-chat-sse";
import { BRAND } from "@/lib/constants";
import { Link } from "@/i18n/navigation";
import { AppleThemeToggle } from "@/components/theme/apple-theme-toggle";
import { V5ChatPricingModal, type PricingModalFocus } from "./v5-chat-pricing-modal";
import {
  HybridTripComposer,
  HYBRID_SLOT_OPTIONS,
  HYBRID_TRIP_EMPTY,
  buildHybridPrompt,
  hybridHasMinimumForSend,
  useLgUp,
  type HybridTripKey,
} from "./v5-hybrid-trip-composer";
import { V5TravelAiAnalysisLoadingOverlay } from "./v5-travel-ai-analysis-loading";
import type { SpotTourEnrichment } from "@/lib/tour-api/tour-spot-client";
import { tourImageUnoptimized, tourSpotApiUrl } from "@/lib/tour-api/tour-spot-client";

// ─── Composer: 여행 프롬프트 체크리스트 (실시간 키워드 감지) ───────────────────

type TravelPromptCheckKey =
  | "region"
  | "localZone"
  | "exploreDepth"
  | "schedule"
  | "people"
  | "transport"
  | "atmosphere"
  | "food";

const TRAVEL_PROMPT_CHECKLIST: { key: TravelPromptCheckKey; label: string; hint: string }[] = [
  { key: "region", label: "지역", hint: "도시·권역" },
  { key: "localZone", label: "구역·코스", hint: "동네·해변·한옥 등" },
  { key: "exploreDepth", label: "탐색 깊이", hint: "여유·촘촘·반나절" },
  { key: "schedule", label: "일정", hint: "박·일·기간" },
  { key: "people", label: "인원", hint: "명수·동행" },
  { key: "transport", label: "교통", hint: "도보·대중교통 등" },
  { key: "atmosphere", label: "분위기", hint: "느낌·스타일" },
  { key: "food", label: "음식", hint: "취향·맛집" },
];

const DEPARTURE_CHIP_ID = "trip_departure_origin";

/** 이전 키(`wayly-v5-composer-mode`)는 무시 — 한 번 더 하이브리드 기본(간편 선택)이 보이도록 */
const V5_COMPOSER_MODE_STORAGE_KEY = "wayly-v5-composer-mode-v3";

function evaluateTravelPromptChecklist(text: string): Record<TravelPromptCheckKey, boolean> {
  const s = text;
  const c = s.replace(/\s/g, "");
  return {
    region:
      /서울|부산|대구|인천|광주|대전|울산|세종|제주|경주|전주|여수|속초|평창|안동|통영|해운대|명동|홍대|강남|강릉|춘천|양양|안양|수원|용인|고양|파주|화성|김해|창원|진주|목포|순천|원주|충주|청주|포항|군산|남해|거제|하동|보성|광양|제주도|전라|경상|충청|강원|경기|전북|전남|경북|경남|충북|충남|내륙|동해|서해|한국|국내/i.test(
        s,
      ) || /[가-힣]{2,8}(시|도|군)(으로|에서|\s|,|\.|$)/.test(c) || /[가-힣]{2,6}(으로|에서)(여행|간|갈|놀러)/.test(c),
    localZone:
      /한옥|해운대|광안리|남포|서면|황리단|불국사|첨성대|익선|종로|한옥마을|서귀포|애월|한림|중문|올레|명동|홍대|강남|안목|경포|권역|동네|골목|시장|해변|바다|유적|전망/i.test(
        s,
      ),
    exploreDepth:
      /천천히|여유|느긋|빡빡|촘촘|알차게|반나절|오전만|저녁만|핵심만|랜드마크|하루에|짧게|깊게|로컬\s*동선|현지만/i.test(
        s,
      ),
    schedule:
      /\d+\s*박|\d+\s*일|\d+박\s*\d+일|일정|며칠|주말|평일|당일|하루|이틀|사흘|일주|연휴|방학|휴가|2박|3박|1박/i.test(s),
    people:
      /\d+\s*명|명\s*\d+|인원|혼자|둘이|셋이|넷이|커플|가족|친구|아이|유아|초등|중학|고등|청소년|단체|성인|소인|어른/i.test(s),
    transport:
      /지하철|버스|ktx|srt|기차|철도|택시|렌트|리무진|자가용|도보|걸어|드라이브|비행기|공항|셔틀|전철|itx|무궁화|고속버스|시외버스/i.test(s),
    atmosphere:
      /한적|조용|북적|활기|분위기|로컬|현지|관광|힐링|사진|인생샷|럭셔리|가성비|감성|힙|빈티지|조용한|붐비는/i.test(s),
    food:
      /맛집|음식|먹|한식|중식|양식|일식|분식|카페|커피|술|술집|디저트|브런치|채식|비건|미슐랭|순대|삼겹|해산물|회|고기|뷔페|밥집/i.test(s),
  };
}

/** AI gather(조회) 전 최소 조건: 지역 + 일정(기간) 힌트가 있어야 의미 있는 추출 가능 */
function isGatherQueryReady(check: Record<TravelPromptCheckKey, boolean>): boolean {
  return Boolean(check.region && check.schedule);
}

function extractRegionSnippet(text: string): string | null {
  const s = text.trim();
  const cityRe =
    /서울|부산|대구|인천|광주|대전|울산|세종|제주도|제주|경주|전주|여수|속초|평창|안동|통영|해운대|명동|홍대|강남|강릉|춘천|양양|안양|수원|용인|고양|파주|화성|김해|창원|진주|목포|순천|원주|충주|청주|포항|군산|남해|거제|하동|보성|광양/gi;
  const m = cityRe.exec(s);
  if (m) return m[0];
  const m2 = /([가-힣]{2,8}(?:시|도|군))/.exec(s.replace(/\s+/g, " "));
  if (m2) return m2[1];
  return null;
}

function extractScheduleSnippet(text: string): string | null {
  const s = text.trim();
  const m =
    /\d+\s*박\s*\d+\s*일|\d+\s*박|\d+\s*일|당일\s*치기|당일|주말|평일|연휴|일주일|1박2일|2박3일|3박4일/i.exec(
      s,
    );
  if (m) return m[0].replace(/\s+/g, " ").trim();
  return null;
}

function extractLocalZoneSnippet(text: string): string | null {
  const s = text.trim();
  const m =
    /(해운대|광안리|남포|서면|황리단길|불국사|첨성대|익선동|한옥마을|서귀포|애월|한림|중문|명동|홍대|강남|안목|경포|코엑스|광화문)/i.exec(
      s,
    );
  if (m) return m[1];
  const hood = /([가-힣]{2,10}(?:동|가|로|길))\s*(?:근처|일대|중심)/.exec(s);
  return hood ? hood[1].trim() : null;
}

function extractExploreDepthSnippet(text: string): string | null {
  const s = text.trim();
  if (/천천히|여유|느긋/i.test(s)) return "여유 있게";
  if (/빡빡|촘촘|알차게|많이/i.test(s)) return "동선 촘촘히";
  if (/반나절|오전만|저녁만|짧게/i.test(s)) return "반나절·짧게";
  if (/핵심|대표만|유명한\s*것만/i.test(s)) return "핵심만";
  return null;
}

/** 조회 조건이 부족할 때 LLM 없이 바로 띄울 칩(지역·일정 필수 슬롯 + 감지된 항목) */
function buildQuickPreferenceChips(
  text: string,
  check: Record<TravelPromptCheckKey, boolean>,
): PreferenceChip[] {
  const chips: PreferenceChip[] = [];
  const regionGuess = extractRegionSnippet(text);
  const scheduleGuess = extractScheduleSnippet(text);

  chips.push({
    id: "trip_region",
    label: "지역",
    value: check.region
      ? regionGuess ?? "지역명을 조금 더 구체적으로 적어 주세요"
      : regionGuess ?? "(예: 경주, 제주, 부산 해운대)",
  });
  chips.push({
    id: "trip_schedule",
    label: "일정",
    value: check.schedule
      ? scheduleGuess ?? "박·일이나 당일 등 기간을 숫자로 적어 주세요"
      : scheduleGuess ?? "(예: 2박 3일, 당일)",
  });

  if (check.localZone) {
    const z = extractLocalZoneSnippet(text);
    chips.push({
      id: "trip_local_zone",
      label: "동선 중심",
      value: z ?? "구역·동네를 칩에서 다듬어 주세요",
    });
  }

  if (check.exploreDepth) {
    const d = extractExploreDepthSnippet(text);
    chips.push({
      id: "trip_explore_depth",
      label: "탐색 스타일",
      value: d ?? "일정 밀도는 칩에서 조정해 주세요",
    });
  }

  if (check.people) {
    const p = /\d+\s*명|혼자|둘이|셋이|넷이|커플|가족|친구\s*\d+|가족\s*\d+명/i.exec(text);
    chips.push({
      id: "trip_people",
      label: "인원",
      value: p ? p[0].trim() : "인원·동행을 적어 주세요",
    });
  }
  if (check.transport) {
    const t =
      /KTX|SRT|ITX|ktx|srt|렌터카|렌트|자가용|대중교통|지하철|버스|택시|도보|비행기|공항셔틀/i.exec(text);
    chips.push({
      id: "trip_transport",
      label: "교통",
      value: t ? t[0] : "이동 수단을 적어 주세요",
    });
  }
  if (check.atmosphere) {
    chips.push({
      id: "trip_vibe",
      label: "분위기",
      value: "입력하신 분위기·스타일을 유지할게요 (칩에서 수정 가능)",
    });
  }
  if (check.food) {
    chips.push({
      id: "trip_food",
      label: "음식",
      value: "맛집·음식 취향은 칩에서 다듬어 주세요",
    });
  }

  return chips;
}

// ─── Domain Types ──────────────────────────────────────────────────────────────

type SpotType = "attraction" | "food" | "cafe" | "transport" | "hotel";

interface TravelSpot {
  id: string; name: string; type: SpotType; duration: string;
  note?: string;
  transitToNext?: string;
  transitMode?: "surface" | "flight" | "ferry";
  lat?: number; lng?: number;
}

interface TravelPlan {
  id: string; title: string; region: string; days: number; summary: string;
  spots: TravelSpot[]; weatherNote?: string; totalTime?: string;
  alternativeNote?: string;
}

interface PreferenceChip {
  id: string;
  label: string;
  value: string;
  category?: string;
}

interface Message {
  id: string; role: "user" | "assistant"; content: string;
  timestamp: Date; travelPlan?: TravelPlan;
  /** AI가 추출·정리한 여행 조건 칩 (컨펌 전) */
  preferenceChips?: PreferenceChip[];
  canGenerateRoute?: boolean;
  /** DB에 저장된 경우 row ID */
  dbId?: string;
  /** `/api/chat` 스트리밍 수신 중 */
  isStreaming?: boolean;
}

interface Conversation {
  id: string;        // Supabase UUID (로그인) 또는 로컬 temp ID (게스트)
  title: string;
  createdAt: Date;
  messages: Message[];
  /** messages가 DB에서 로드 완료됐는지 */
  messagesLoaded: boolean;
}

interface SavedPlan {
  id: string; title: string; region: string;
  savedAt: Date; plan: TravelPlan; fromConversationId: string;
  dbId?: string;
}

// ─── DB ↔ UI 변환 유틸 ────────────────────────────────────────────────────────

function dbConvToConv(db: DBConversation): Conversation {
  return {
    id: db.id,
    title: db.title,
    createdAt: new Date(db.created_at),
    messages: [],         // 메시지는 대화 선택 시 lazy-load
    messagesLoaded: false,
  };
}

function dbMsgToMessage(db: DBMessage): Message {
  let travelPlan: TravelPlan | undefined;
  let preferenceChips: PreferenceChip[] | undefined;
  let canGenerateRoute: boolean | undefined;
  const raw = db.travel_plan;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o._v5Kind === "preferences" && Array.isArray(o.chips)) {
      preferenceChips = o.chips as PreferenceChip[];
      canGenerateRoute = Boolean(o.readyToGenerateRoute);
    } else if (Array.isArray(o.spots)) {
      travelPlan = raw as unknown as TravelPlan;
    }
  }
  return {
    id: db.id,
    dbId: db.id,
    role: db.role,
    content: db.content,
    timestamp: new Date(db.created_at),
    travelPlan,
    preferenceChips,
    canGenerateRoute,
  };
}

function assistantTravelPlanForDb(m: Pick<Message, "travelPlan" | "preferenceChips" | "canGenerateRoute">): Record<string, unknown> | null {
  if (m.travelPlan) return m.travelPlan as unknown as Record<string, unknown>;
  if (m.preferenceChips && m.preferenceChips.length > 0) {
    return {
      _v5Kind: "preferences",
      chips: m.preferenceChips,
      readyToGenerateRoute: Boolean(m.canGenerateRoute),
    };
  }
  return null;
}

function messagesToApiPayload(messages: Message[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
}

function dbPlanToSaved(db: DBSavedPlan): SavedPlan {
  return {
    id: db.id,
    dbId: db.id,
    title: db.title,
    region: db.region,
    savedAt: new Date(db.saved_at),
    plan: db.plan_data as unknown as TravelPlan,
    fromConversationId: db.from_conversation_id ?? "",
  };
}

// ─── 초기 웰컴 메시지 ──────────────────────────────────────────────────────────

const makeWelcomeMsg = (): Message => ({
  id: `welcome-${Date.now()}`,
  role: "assistant",
  content:
    "안녕하세요! **도시·동네 안 로컬 동선**을 함께 짤게요. 여행 지역·구역(해변·한옥 등)·일정·탐색 스타일·인원·교통·분위기·음식을 말씀해 주시면 칩으로 정리해 드리고, 확인 후 「이 정보로 동선 짜기」를 누르면 그 권역 안에서만 스팟 순서·이동·소요 시간을 담은 코스를 만들어요. (출발·귀경지 왕복은 다루지 않아요.) 아래 예시를 눌러 시작해 보세요.",
  timestamp: new Date(),
});

const makeGuestConv = (): Conversation => ({
  id: `guest-${Date.now()}`,
  title: "새 대화",
  createdAt: new Date(),
  messages: [makeWelcomeMsg()],
  messagesLoaded: true,
});

// ─── Mock AI 응답 ─────────────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, { content: string; plan?: TravelPlan }> = {
  default: {
    content: "여행 정보를 분석 중이에요. 조금 더 구체적으로 알려주시면 정확한 동선을 제안드릴 수 있어요. 어느 지역, 몇 박 일정인지, 혼자인지 동행이 있는지, 관심사(맛집/역사/자연/K-콘텐츠)도 함께 알려주세요.",
  },
  gyeongju: {
    content: "경주 2박 3일 혼자 여행 동선을 분석했어요. 역사 + 맛집 중심으로, 이동 피로가 적고 맥락이 연결되는 순서로 구성했습니다. 오전 일찍 시작하면 3일차 오후에 여유 시간이 생겨요.",
    plan: {
      id: "plan-gyeongju-01", title: "경주 역사·맛집 핵심 동선", region: "경주", days: 2,
      summary: "불국사 → 첨성대 → 황리단길 순서로 이동 거리를 최소화했어요. 1일차는 남산·불국사 권역, 2일차는 도심 유적, 3일차는 감포 여유 루트.",
      spots: [
        { id: "s1", name: "불국사", type: "attraction", duration: "약 2시간", note: "개장 직후(09:00) 입장 시 한적해요. 석굴암은 별도 입장권 필요.", transitToNext: "택시 약 25분", lat: 35.7900, lng: 129.3316 },
        { id: "s2", name: "황리단길 점심", type: "food", duration: "약 1시간 30분", note: "경주빵+교리김밥 필수. 오후 1시 넘으면 줄이 길어져요.", transitToNext: "도보 15분", lat: 35.8326, lng: 129.2134 },
        { id: "s3", name: "첨성대 · 계림", type: "attraction", duration: "약 1시간", note: "해질 무렵이 가장 아름다워요. 야간 조명도 운영.", transitToNext: "도보 10분", lat: 35.8353, lng: 129.2195 },
        { id: "s4", name: "동궁과 월지(안압지)", type: "attraction", duration: "약 1시간 30분", note: "야간 입장 추천. 조명 반영이 인생샷 포인트.", transitToNext: "택시 약 10분", lat: 35.8340, lng: 129.2263 },
        { id: "s5", name: "경주 시내 숙소", type: "hotel", duration: "1박", note: "황리단길 인근 숙소가 이동에 유리해요.", lat: 35.8430, lng: 129.2130 },
      ],
      weatherNote: "4월 경주 낮 기온 18-22°C, 일교차 10°C. 저녁 야외 관람 시 가벼운 겉옷 필수.",
      totalTime: "약 1시간 30분",
      alternativeNote: "비 예보 시: 국립경주박물관(실내)으로 오전 일정 대체 가능.",
    },
  },
  busan: {
    content: "부산 당일치기는 동선 압축이 핵심이에요. 해운대 권역과 남포동·감천 권역은 이동이 30분 이상이니 하루에 둘 다 욕심내면 이동만 하다 끝나요. 남포동 중심으로 짠 동선을 제안해 드릴게요.",
    plan: {
      id: "plan-busan-01", title: "부산 당일 맛집 집중 코스", region: "부산", days: 1,
      summary: "남포동·자갈치 중심으로 이동 최소화. 오전 시장 → 점심 회 → 오후 감천 뷰 → 저녁 광안리 순서.",
      spots: [
        { id: "b1", name: "자갈치시장", type: "food", duration: "약 1시간", note: "아침 7시부터 운영. 신선한 어물과 즉석 회가 저렴해요.", transitToNext: "도보 5분", lat: 35.0971, lng: 129.0304 },
        { id: "b2", name: "국제시장·BIFF광장", type: "attraction", duration: "약 1시간 30분", note: "씨앗호떡은 줄이 길어도 먹을 가치 있어요.", transitToNext: "버스 15분", lat: 35.0989, lng: 129.0258 },
        { id: "b3", name: "감천문화마을", type: "attraction", duration: "약 1시간 30분", note: "오전 10시 전 방문하면 한적해요. 오후엔 관광객 많음.", transitToNext: "버스+지하철 40분", lat: 35.0980, lng: 129.0097 },
        { id: "b4", name: "광안리해수욕장", type: "attraction", duration: "저녁 이후", note: "광안대교 야경 + 해산물 포장마차. 일몰 맞추면 최고.", lat: 35.1531, lng: 129.1185 },
      ],
      weatherNote: "부산 해안가는 바람이 강해요. 자외선 차단 및 바람막이 권장.",
      totalTime: "이동 합산 약 2시간",
      alternativeNote: "해운대 권역 선택 시: 해운대→미포→청사포 해안 산책로 코스로 전환 가능.",
    },
  },
  jeju: {
    content: "제주 4박 5일 렌터카 여행이면 서쪽과 동쪽을 나눠서 탐색하는 게 효율적이에요. 렌터카 픽업 위치(공항)를 기준으로 첫날 방향을 서쪽·동쪽 중 고르면 동선이 꼬이지 않아요.",
    plan: {
      id: "plan-jeju-01", title: "제주 서쪽 해안 1일 코스", region: "제주", days: 1,
      summary: "협재해수욕장 → 한림공원 → 오설록 → 용머리해안 순으로 서쪽 해안 핵심만 압축. 일몰은 용머리해안에서.",
      spots: [
        { id: "j1", name: "협재해수욕장", type: "attraction", duration: "약 1시간", note: "에메랄드빛 물색이 제주에서 가장 아름다운 해변 중 하나.", transitToNext: "차로 10분", lat: 33.3938, lng: 126.2397 },
        { id: "j2", name: "한림공원", type: "attraction", duration: "약 1시간 30분", note: "협재굴·쌍용굴 포함. 용암동굴 내부는 연중 서늘해요.", transitToNext: "차로 25분", lat: 33.4138, lng: 126.2630 },
        { id: "j3", name: "오설록 티뮤지엄", type: "cafe", duration: "약 1시간", note: "녹차 아이스크림+티 세트 필수. 주변 이니스프리 숍도 인기.", transitToNext: "차로 20분", lat: 33.3064, lng: 126.2881 },
        { id: "j4", name: "용머리해안", type: "attraction", duration: "약 1시간 30분", note: "물때 확인 필수(물 차면 입장 불가). 일몰 포인트 최고.", lat: 33.2393, lng: 126.3175 },
      ],
      weatherNote: "제주 바람은 예측 불가. 기상청 기준 초속 7m 이상이면 야외 활동 시 주의.",
      totalTime: "이동 합산 약 1시간 15분",
      alternativeNote: "비 예보 시: 오설록 → 제주 민속자연사박물관 → 넥슨컴퓨터박물관 실내 대체 루트.",
    },
  },
};

function getMockResponse(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("경주")) return MOCK_RESPONSES.gyeongju;
  if (lower.includes("부산")) return MOCK_RESPONSES.busan;
  if (lower.includes("제주")) return MOCK_RESPONSES.jeju;
  return MOCK_RESPONSES.default;
}

// ─── 작은 UI 컴포넌트들 ───────────────────────────────────────────────────────

function SpotIcon({ type }: { type: SpotType }) {
  const iconMap: Record<SpotType, React.ReactNode> = {
    attraction: <Camera className="w-3.5 h-3.5" />,
    food: <Utensils className="w-3.5 h-3.5" />,
    cafe: <Coffee className="w-3.5 h-3.5" />,
    transport: <Train className="w-3.5 h-3.5" />,
    hotel: <Hotel className="w-3.5 h-3.5" />,
  };
  const colorMap: Record<SpotType, string> = {
    attraction:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300",
    food: "bg-orange-50 text-orange-500 dark:bg-orange-950/60 dark:text-orange-300",
    cafe: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    transport:
      "bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-300",
    hotel: "bg-purple-50 text-purple-600 dark:bg-purple-950/65 dark:text-purple-300",
  };
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[type]}`}>
      {iconMap[type]}
    </div>
  );
}

function TravelRouteCard({
  plan, isSaved, onSave, onViewMap,
}: {
  plan: TravelPlan; isSaved: boolean;
  onSave: (p: TravelPlan) => void; onViewMap: (p: TravelPlan) => void;
}) {
  const [tourBySpotId, setTourBySpotId] = useState<
    Record<string, SpotTourEnrichment | "err" | undefined>
  >({});

  const spotsTourFetchKey = useMemo(
    () => plan.spots.map((s) => `${s.id}:${s.name}`).join("|"),
    [plan.spots],
  );

  useEffect(() => {
    const ac = new AbortController();
    plan.spots.forEach((spot) => {
      void (async () => {
        try {
          const r = await fetch(tourSpotApiUrl(spot, plan.region), {
            signal: ac.signal,
          });
          const j = (await r.json()) as
            | {
                ok: true;
                contentId: string;
                contentTypeId: string;
                title: string;
                imageUrl: string | null;
                displayImageUrl: string;
                overview: string | null;
              }
            | { ok: false };
          if (ac.signal.aborted) return;
          if (j.ok === true) {
            setTourBySpotId((prev) => ({
              ...prev,
              [spot.id]: {
                contentId: j.contentId,
                contentTypeId: j.contentTypeId,
                title: j.title,
                imageUrl: j.imageUrl,
                displayImageUrl: j.displayImageUrl,
                overview: j.overview,
              },
            }));
          } else {
            setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
          }
        } catch {
          if (!ac.signal.aborted) setTourBySpotId((prev) => ({ ...prev, [spot.id]: "err" }));
        }
      })();
    });
    return () => ac.abort();
  }, [plan.id, plan.region, spotsTourFetchKey]);

  const hasMapCoords = plan.spots.some(
    (s) =>
      s.lat != null &&
      s.lng != null &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng),
  );

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden shadow-[0_2px_12px_rgba(20,20,20,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--brand-trust-blue)]" />
              <span className="text-xs font-semibold text-[var(--brand-trust-blue)] tracking-wide uppercase">추천 동선</span>
            </div>
            <p className="text-[15px] font-semibold text-[var(--text-strong)] leading-snug">{plan.title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{plan.region} · {plan.days}일 코스</p>
          </div>
          <span className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]">
            {plan.days}박 {plan.days + 1}일
          </span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">{plan.summary}</p>
      </div>
      <div className="px-4 py-3">
        {plan.spots.map((spot, idx) => {
          const tour = tourBySpotId[spot.id];
          const tourImg =
            tour && tour !== "err" && tour.imageUrl && tour.imageUrl.length > 0
              ? tour.imageUrl
              : null;
          const tourLoading = tour === undefined;
          return (
          <div key={spot.id}>
            <div className="flex items-start gap-3 py-2">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface-subtle)] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                {tourImg ? (
                  <Image
                    src={tourImg}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    sizes="48px"
                    unoptimized={tourImageUnoptimized(tourImg)}
                  />
                ) : tourLoading ? (
                  <div className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]/35" />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <SpotIcon type={spot.type} />
                  </div>
                )}
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-[var(--text-strong)] px-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                  {idx + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{spot.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[11px] text-[var(--text-muted)]">{spot.duration}</span>
                  </div>
                </div>
                {spot.note && <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{spot.note}</p>}
                {tour && tour !== "err" && tour.overview ? (
                  <div className="mt-1.5 rounded-lg border border-[var(--border-default)]/70 bg-[var(--bg-surface-subtle)]/50 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      소개 · 한국관광공사
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)] line-clamp-4 whitespace-pre-line">
                      {tour.overview}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            {spot.transitToNext && idx < plan.spots.length - 1 && (
              <div className="flex items-center gap-2 pl-3 pb-1">
                <div className="w-0.5 h-3 bg-[var(--border-strong)] ml-2.5" />
                <Navigation className="w-3 h-3 text-[var(--text-muted)] ml-1" />
                <span className="text-[11px] text-[var(--text-muted)]">{spot.transitToNext}</span>
              </div>
            )}
          </div>
          );
        })}
      </div>
      <div className="px-4 pb-3 space-y-2">
        {plan.weatherNote && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)]">
            <CloudSun className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0" />
            <p className="text-[12px] text-[var(--text-secondary)]">{plan.weatherNote}</p>
          </div>
        )}
        {plan.alternativeNote && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--warning-soft)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0" />
            <p className="text-[12px] text-[var(--text-secondary)]">{plan.alternativeNote}</p>
          </div>
        )}
        {plan.totalTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[11px] text-[var(--text-muted)]">총 이동시간 약 {plan.totalTime}</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={!hasMapCoords}
          title={
            hasMapCoords
              ? "실제 도로를 따라 동선을 지도에서 봅니다."
              : "스팟에 좌표가 있어야 지도를 열 수 있어요."
          }
          onClick={() => hasMapCoords && onViewMap(plan)}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[13px] font-semibold transition-all duration-200 border ${
            hasMapCoords
              ? "border-[var(--brand-trust-blue)]/35 bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] hover:bg-[color-mix(in_srgb,var(--brand-trust-blue)_18%,var(--bg-surface))] active:scale-[0.98]"
              : "border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
          }`}
        >
          <Map className="w-4 h-4" />
          지도 보기
        </button>
        <button
          type="button"
          onClick={() => !isSaved && onSave(plan)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${
            isSaved
              ? "bg-[var(--success-soft)] text-[var(--success)] cursor-default"
              : "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.98]"
          }`}
        >
          {isSaved ? <><BookmarkCheck className="w-4 h-4" />저장됨</> : <><Bookmark className="w-4 h-4" />추천한 동선 저장</>}
        </button>
      </div>
    </div>
  );
}

/** 동선 타임라인 본문 — 데스크톱 우측 패널 / 모바일·태블릿 풀스크린 공통 */
function PlanPreviewTimelineBody({
  plan,
  isSaved,
  onSave,
  onViewMap,
}: {
  plan: TravelPlan;
  isSaved: boolean;
  onSave: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
}) {
  const hasMapCoords = plan.spots.some(
    (s) =>
      s.lat != null &&
      s.lng != null &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng),
  );

  return (
    <>
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]/50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          지도 · 타임라인
        </p>
        <p className="text-[15px] font-semibold text-[var(--text-strong)] leading-snug mt-1 line-clamp-2">
          {plan.title}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {plan.region} · {plan.days}일 코스
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
        <ol className="space-y-0 list-none m-0 p-0">
          {plan.spots.map((spot, idx) => (
            <li key={spot.id} className="relative">
              <div className="flex gap-2.5 py-2 pl-1">
                <div className="flex flex-col items-center flex-shrink-0 w-6">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--text-strong)] text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  {idx < plan.spots.length - 1 && (
                    <span className="w-px flex-1 min-h-[0.75rem] bg-[var(--border-strong)] my-0.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[var(--text-strong)] leading-snug line-clamp-2">
                      {spot.name}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                      {spot.duration}
                    </span>
                  </div>
                  {spot.note && (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-3 leading-relaxed">
                      {spot.note}
                    </p>
                  )}
                  {spot.transitToNext && idx < plan.spots.length - 1 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      <Navigation className="w-3 h-3 flex-shrink-0" aria-hidden />
                      {spot.transitToNext}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex-shrink-0 p-3 border-t border-[var(--border-default)] bg-[var(--bg-page)] flex flex-col gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!hasMapCoords}
          title={
            hasMapCoords
              ? "동선을 지도에서 봅니다."
              : "스팟에 좌표가 있어야 지도를 열 수 있어요."
          }
          onClick={() => hasMapCoords && onViewMap(plan)}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-4 text-[13px] font-semibold transition-all duration-200 border ${
            hasMapCoords
              ? "border-[var(--brand-trust-blue)]/35 bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] hover:bg-[color-mix(in_srgb,var(--brand-trust-blue)_18%,var(--bg-surface))] active:scale-[0.98]"
              : "border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
          }`}
        >
          <Map className="w-4 h-4" />
          지도 보기
        </button>
        <button
          type="button"
          onClick={() => !isSaved && onSave(plan)}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[12px] font-semibold transition-all duration-200 ${
            isSaved
              ? "bg-[var(--success-soft)] text-[var(--success)] cursor-default"
              : "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.98]"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-4 h-4" />
              저장됨
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              동선 저장
            </>
          )}
        </button>
      </div>
    </>
  );
}

/** lg 이상 가로 분할 우측 패널 (1024px+ landscape 그리드에서만 표시) */
function TabletPlanPreviewPane({
  plan,
  isSaved,
  onSave,
  onViewMap,
}: {
  plan: TravelPlan | null;
  isSaved: boolean;
  onSave: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
}) {
  if (!plan) {
    return (
      <aside
        className="v5-chat-split-preview border-l border-[var(--border-default)] bg-[var(--bg-surface)]"
        aria-label="동선 미리보기"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <Map className="h-8 w-8 text-[var(--text-muted)]/40" aria-hidden />
          <p className="text-[13px] font-medium text-[var(--text-secondary)] leading-snug">
            동선이 생성되면
          </p>
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed max-w-[220px]">
            이 패널에 타임라인이 보이고, 지도로 바로 열 수 있어요.
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-2 max-w-[260px]">
            좁은 화면에서는 채팅 상단 <strong className="text-[var(--text-strong)]">내 플랜</strong>으로 전체 화면을 열 수 있어요.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="v5-chat-split-preview border-l border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col min-h-0 min-w-0"
      aria-label="지도 및 타임라인"
    >
      <PlanPreviewTimelineBody
        plan={plan}
        isSaved={isSaved}
        onSave={onSave}
        onViewMap={onViewMap}
      />
    </aside>
  );
}

/** 모바일·태블릿(lg 미만): 동선 타임라인 풀스크린 */
function MobilePlanFullscreenOverlay({
  open,
  onClose,
  plan,
  isSaved,
  onSave,
  onViewMap,
}: {
  open: boolean;
  onClose: () => void;
  plan: TravelPlan;
  isSaved: boolean;
  onSave: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-page)] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="내 플랜 전체 보기"
    >
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <Map className="h-5 w-5 shrink-0 text-[var(--brand-trust-blue)]" aria-hidden />
          <span className="text-[15px] font-semibold text-[var(--text-strong)] truncate">내 플랜</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] touch-manipulation"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PlanPreviewTimelineBody
          plan={plan}
          isSaved={isSaved}
          onSave={onSave}
          onViewMap={(p) => {
            onViewMap(p);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

/**
 * Gemini가 주는 칩 id는 snake_case로 매번 달라질 수 있음.
 * 레거시 칩(출발·귀경지)은 UI에서 숨기고 확정 시 제외합니다.
 */
function isDeparturePreferenceChip(c: PreferenceChip): boolean {
  if (c.id === DEPARTURE_CHIP_ID) return true;
  const raw = c.label.trim();
  const compact = raw.replace(/\s+/g, "");
  if (compact.includes("출발·귀경지") || compact.includes("출발/귀경지")) return true;
  if (raw === "출발지" || compact === "출발지") return true;
  if (/출발/.test(compact) && (/귀경/.test(compact) || /복귀/.test(compact))) return true;
  const idLower = c.id.toLowerCase();
  if (idLower.includes("departure") && (idLower.includes("origin") || idLower.includes("return")))
    return true;
  return false;
}

function PreferenceChipsCard({
  chips,
  readyToGenerateRoute,
  onConfirm,
  isGenerating,
}: {
  chips: PreferenceChip[];
  readyToGenerateRoute: boolean;
  onConfirm: (slots: PreferenceChip[]) => void;
  isGenerating: boolean;
}) {
  const displayChips = useMemo(
    () => chips.filter((c) => !isDeparturePreferenceChip(c)),
    [chips],
  );

  const hasCoreSlots = useMemo(() => {
    const regionOk = displayChips.some((c) => c.id === "trip_region" || c.label.includes("지역"));
    const schedOk = displayChips.some((c) => c.id === "trip_schedule" || c.label.includes("일정"));
    return regionOk && schedOk;
  }, [displayChips]);

  const canSubmit = displayChips.length > 0 && hasCoreSlots && !isGenerating;

  return (
    <div className="mt-3 w-full max-w-[480px] rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[0_4px_24px_rgba(20,20,20,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--brand-trust-blue)]" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">정리한 여행 조건</span>
        {readyToGenerateRoute && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            동선 생성 가능
          </span>
        )}
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">
        <strong className="font-semibold text-[var(--text-strong)]">선택한 지역 안에서만</strong> 로컬 동선으로 짭니다. 칩을 다듬은 뒤 동선 만들기를 눌러 주세요.
      </p>

      <div className="v5-prompt-chips-strip overflow-x-auto -mx-1 px-1 pb-1 mb-4 touch-pan-x">
        <div className="flex flex-nowrap gap-2 pr-3 w-max max-w-none">
        {displayChips.length === 0 ? (
          <span className="text-[12px] text-[var(--text-muted)] shrink-0 py-1">남은 칩이 없어요. 다시 대화로 알려 주세요.</span>
        ) : (
          displayChips.map((c) => (
            <span
              key={c.id}
              className="v5-prompt-chip-item inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] border border-[color-mix(in_srgb,var(--brand-trust-blue)_24%,var(--border-default))]"
            >
              <span className="text-[10px] opacity-80">{c.label}</span>
              <span className="text-[var(--text-strong)]">{c.value}</span>
            </span>
          ))
        )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onConfirm(displayChips)}
        disabled={!canSubmit}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 ${
          canSubmit
            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.99]"
            : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
        }`}
      >
        {isGenerating ? "동선 짜는 중…" : "이 정보로 동선 짜기"}
      </button>
      {displayChips.length > 0 && !hasCoreSlots && (
        <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
          지역·일정 칩이 있어야 동선을 만들 수 있어요.
        </p>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  savedPlanIds,
  onSavePlan,
  onViewMap,
  onConfirmRoute,
  routeGeneratingMessageId,
}: {
  message: Message;
  savedPlanIds: Set<string>;
  onSavePlan: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
  onConfirmRoute?: (messageId: string, slots: PreferenceChip[]) => void;
  routeGeneratingMessageId: string | null;
}) {
  const isUser = message.role === "user";
  const chips = message.preferenceChips ?? [];
  const showChips = !isUser && chips.length > 0 && onConfirmRoute;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm ring-1 ring-white/25"
          style={{ background: "#0891ff" }}
          aria-hidden
        >
          <Sparkles className="w-3.5 h-3.5 text-white drop-shadow-sm" />
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
          isUser
            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] rounded-br-sm"
            : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-bl-sm shadow-[0_1px_6px_rgba(20,20,20,0.05)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.28)]"
        }`}>
          {message.isStreaming && !message.content ? (
            <span className="text-[13px] text-[var(--text-muted)]">답변을 이어서 쓰는 중…</span>
          ) : (
            <>
              {message.content}
              {message.isStreaming && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-[-2px] bg-[var(--brand-trust-blue)]/80 animate-pulse rounded-sm"
                  aria-hidden
                />
              )}
            </>
          )}
        </div>
        {showChips && (
          <PreferenceChipsCard
            chips={chips}
            readyToGenerateRoute={Boolean(message.canGenerateRoute)}
            onConfirm={(slots) => onConfirmRoute(message.id, slots)}
            isGenerating={routeGeneratingMessageId === message.id}
          />
        )}
        {!isUser && message.travelPlan && (
          <div className="w-full max-w-[480px]">
            <TravelRouteCard
              plan={message.travelPlan}
              isSaved={savedPlanIds.has(message.travelPlan.id)}
              onSave={onSavePlan}
              onViewMap={onViewMap}
            />
          </div>
        )}
        <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
          {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

/** 빈 화면 — 로컬 동선 템플릿(괄호만 고치면 됨) */
const TRIP_START_TEMPLATES = [
  {
    key: "local_day",
    title: "당일·짧은 코스",
    subtitle: "시내·동네 안에서만",
    prompt:
      "이 지역 안에서만 당일 동선으로 짜 줘. 지역: (예: 전주 한옥마을 일대 / 부산 해운대) / 일정: (예: 당일 또는 오전만) / 인원: ( ) / 이동: (예: 도보·버스) / 취향: (예: 맛집·한옥·사진). 다른 도시 이동·귀경 구간은 넣지 마.",
  },
  {
    key: "local_multi",
    title: "며칠·깊은 탐색",
    subtitle: "같은 권역에서만 며칠치",
    prompt:
      "아래 조건으로 이 지역만 깊게 동선 짜 줘. 지역: (예: 제주 서귀포+중문) / 일정: (예: 2박 3일) / 동선 중심: (예: 바다·올레·시장) / 탐색 스타일: (여유 있게 또는 동선 촘촘히) / 인원·교통·분위기·음식: ( ). 외부 도시 왕복은 포함하지 마.",
  },
] as const;

const RICH_START_EXAMPLES = [
  "전주 한옥마을 중심 당일, 혼자, 도보·국밥·카페, 천천히 두세 곳만.",
  "부산 해운대·광안리 일대 1박 2일, 커플, 도보·버스, 바다·야경·맛집, 동선 촘촘히.",
  "제주 서귀포 3박 4일, 가족, 렌터카, 오름·해변·시장, 여유 있게 이어가 줘.",
  "서울 종로·익선동 안에서만 하루, 친구 2명, 한옥·골목·브런치.",
  "강릉 시내·안목해변 2박 3일, 이미 현지에 있다고 가정하고 현지만 짜 줘.",
  "경주 황리단길·대릉원 일대 당일, 도보 위주, 유적·감성 카페.",
] as const;

function WaylyMark({
  boxClass,
  iconClass,
  strokeWidth = 2.35,
}: {
  boxClass: string;
  iconClass: string;
  strokeWidth?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center border border-white/[0.08] shadow-[0_8px_28px_rgba(0,0,0,0.12)] ${boxClass}`}
      style={{ backgroundColor: BRAND.logo.background }}
      aria-hidden
    >
      <Compass
        className={`shrink-0 ${iconClass}`}
        style={{ color: BRAND.logo.electricBlue }}
        strokeWidth={strokeWidth}
      />
    </div>
  );
}

/** 빈 화면용 — `PreferenceChipsCard`와 맞춘 칩 미리보기 */
const EMPTY_HYBRID_CARD_KEYS: HybridTripKey[] = [
  "region",
  "zone",
  "depth",
  "schedule",
  "people",
  "transport",
  "vibe",
  "food",
];

const EMPTY_SLOT_HINT: Record<HybridTripKey, string> = {
  region: "여행지",
  zone: "구역·코스",
  depth: "탐색",
  schedule: "일정",
  people: "인원",
  transport: "이동",
  vibe: "분위기",
  food: "음식",
};

function EmptyStateHybridCard({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
}: {
  draft: Record<HybridTripKey, string>;
  onDraftChange: (next: Record<HybridTripKey, string>) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const [openKey, setOpenKey] = useState<HybridTripKey | null>(null);

  const canSubmit =
    draft.region.trim().length > 0 && draft.schedule.trim().length > 0 && !disabled;

  return (
    <div className="w-full max-w-[480px] rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[0_4px_24px_rgba(20,20,20,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.32)] select-text mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--brand-trust-blue)] shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          정리한 여행 조건
        </span>
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">
        <strong className="font-semibold text-[var(--text-strong)]">지역 안 로컬 동선</strong>을 위해 칩을 골라 주세요. 하단 하이브리드 입력과{" "}
        <strong className="font-semibold text-[var(--text-strong)]">같은 조건</strong>이 맞춰집니다.
      </p>

      <div className="v5-prompt-chips-strip overflow-x-auto -mx-1 px-1 pb-1 mb-2 touch-pan-x">
        <div className="flex flex-wrap gap-2 w-full">
          {EMPTY_HYBRID_CARD_KEYS.map((key) => {
            const v = draft[key].trim();
            const hint = EMPTY_SLOT_HINT[key];
            if (v) {
              return (
                <span
                  key={key}
                  className="v5-prompt-chip-item inline-flex shrink-0 items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-full text-[12px] font-medium bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] border border-[color-mix(in_srgb,var(--brand-trust-blue)_24%,var(--border-default))] max-w-full"
                >
                  <span className="text-[10px] opacity-80 shrink-0">{hint}</span>
                  <span className="text-[var(--text-strong)] truncate min-w-0 max-w-[10rem] sm:max-w-[14rem]">
                    {v}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onDraftChange({ ...draft, [key]: "" });
                      setOpenKey((k) => (k === key ? null : k));
                    }}
                    className="ml-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--error)] transition-colors shrink-0 touch-manipulation"
                    aria-label={`${hint} 선택 취소`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            }
            return (
              <div
                key={key}
                className="v5-prompt-chip-item inline-flex shrink-0 items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-full text-[12px] font-medium bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] border border-[color-mix(in_srgb,var(--brand-trust-blue)_24%,var(--border-default))]"
              >
                <button
                  type="button"
                  onClick={() => setOpenKey((k) => (k === key ? null : key))}
                  className="flex items-center gap-1 touch-manipulation"
                >
                  <span>
                    {hint} 미정
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenKey((k) => (k === key ? null : k));
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-colors touch-manipulation"
                  aria-label={openKey === key ? `${hint} 후보 닫기` : `${hint} 고르기`}
                  title={openKey === key ? "닫기" : "후보 보기"}
                >
                  <X className="w-3 h-3 opacity-70" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {openKey && (
        <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-page)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            {EMPTY_SLOT_HINT[openKey]} 선택
          </p>
          <div className="flex flex-wrap gap-1.5">
            {HYBRID_SLOT_OPTIONS[openKey].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onDraftChange({ ...draft, [openKey]: opt });
                  setOpenKey(null);
                }}
                className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-strong)] hover:bg-[var(--brand-trust-blue-soft)] hover:border-[var(--brand-trust-blue)]/25 transition-colors touch-manipulation"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 touch-manipulation ${
          canSubmit
            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.99]"
            : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
        }`}
      >
        이 정보로 동선 짜기
      </button>
      {(!draft.region.trim() || !draft.schedule.trim()) && (
        <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
          여행지(지역)·일정을 채우면 보낼 수 있어요. 구역·탐색 스타일은 선택이에요.
        </p>
      )}
    </div>
  );
}

function EmptyState({
  onApplyPrompt,
  onOpenPricing,
  onScrollToComposer,
  hybridDraft,
  onHybridDraftChange,
  onSubmitHybridFromCard,
  composerBusy,
}: {
  /** 입력창에 문장을 넣고 포커스 — 괄호 부분만 고친 뒤 전송 */
  onApplyPrompt: (text: string) => void;
  onOpenPricing: () => void;
  /** 화면 하단 하이브리드 칩 영역으로 스크롤 */
  onScrollToComposer: () => void;
  hybridDraft: Record<HybridTripKey, string>;
  onHybridDraftChange: (next: Record<HybridTripKey, string>) => void;
  /** 카드의 「이 정보로 동선 짜기」— 독 펼침 + 전송 */
  onSubmitHybridFromCard: () => void;
  composerBusy: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-28 md:pb-32 select-none overflow-y-auto">
      <WaylyMark
        boxClass="w-16 h-16 rounded-[18px] mb-5"
        iconClass="w-9 h-9"
        strokeWidth={2.4}
      />
      <h1 className="text-[22px] font-bold text-[var(--text-strong)] text-center mb-2 tracking-tight">
        어느 지역을 깊게 둘러볼까요?
      </h1>
      <p className="text-[14px] text-[var(--text-secondary)] text-center max-w-md leading-relaxed mb-4">
        <strong className="font-semibold text-[var(--text-strong)]">도시·동네 안 로컬 동선</strong>에 맞춰 두었어요. 카드에서 고르거나 하단{" "}
        <strong className="font-semibold text-[var(--text-strong)]">8가지 칩</strong>으로 이어서 조합할 수 있어요.
      </p>

      <EmptyStateHybridCard
        draft={hybridDraft}
        onDraftChange={onHybridDraftChange}
        onSubmit={onSubmitHybridFromCard}
        disabled={composerBusy}
      />

      <button
        type="button"
        onClick={onScrollToComposer}
        className="mb-6 text-[13px] font-semibold text-[var(--brand-trust-blue)] underline-offset-4 hover:underline touch-manipulation"
      >
        하단 하이브리드 입력 영역으로 이동 ↓
      </button>
      <p className="text-[13px] text-[var(--text-muted)] text-center max-w-md leading-relaxed mb-6">
        긴 문장이 편하면 <strong className="text-[var(--text-strong)]">자유 입력</strong>(데스크톱) 또는{" "}
        <strong className="text-[var(--text-strong)]">키보드로 직접 입력</strong>(모바일)을 켠 뒤, 예시 문장의{" "}
        <strong className="text-[var(--text-strong)]">괄호 안</strong>만 고쳐내도 됩니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-6">
        {TRIP_START_TEMPLATES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onApplyPrompt(opt.prompt)}
            className="text-left rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-[var(--brand-trust-blue)]/35 hover:shadow-[0_8px_28px_rgba(47,79,143,0.08)] active:scale-[0.99]"
          >
            <span className="block text-[15px] font-semibold text-[var(--text-strong)] tracking-tight">{opt.title}</span>
            <span className="block text-[12px] text-[var(--text-muted)] mt-1 leading-snug">{opt.subtitle}</span>
            <span className="block text-[11px] font-medium text-[var(--brand-trust-blue)] mt-2.5">
              탭하면 자유 입력란에 문장이 들어가요 (직접 입력 모드로 전환)
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 w-full max-w-lg">
        한 줄 예시 (자유 입력에서 탭 → 수정 후 전송)
      </p>
      <div className="flex flex-col gap-2 w-full max-w-lg mb-8">
        {RICH_START_EXAMPLES.map((line) => (
          <button
            key={line}
            type="button"
            onClick={() => onApplyPrompt(line)}
            className="text-left rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-surface-subtle)]/60 px-3.5 py-3 text-[13px] leading-snug text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--brand-trust-blue-soft)] hover:border-[var(--brand-trust-blue)]/25 hover:text-[var(--text-strong)] active:scale-[0.99]"
          >
            {line}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenPricing}
        className="text-[12px] font-medium text-[var(--brand-trust-blue)] underline-offset-4 hover:underline"
      >
        요금제·이용 한도·API 안내 보기
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function groupByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);
  const groups = [
    { label: "오늘", items: [] as Conversation[] },
    { label: "어제", items: [] as Conversation[] },
    { label: "지난 7일", items: [] as Conversation[] },
    { label: "더 이전", items: [] as Conversation[] },
  ];
  for (const c of conversations) {
    const d = new Date(new Date(c.createdAt).getFullYear(), new Date(c.createdAt).getMonth(), new Date(c.createdAt).getDate());
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= lastWeek) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

function SidebarContent({
  conversations, savedPlans, activeConvId,
  onSelectConv, onNewChat, onDeleteConv,
  onSelectPlan, onOpenMap, onClose,
  isLoadingHistory,
}: {
  conversations: Conversation[]; savedPlans: SavedPlan[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void; onNewChat: () => void;
  onDeleteConv: (id: string) => void; onSelectPlan: (sp: SavedPlan) => void;
  onOpenMap: (p: TravelPlan) => void; onClose?: () => void;
  isLoadingHistory: boolean;
}) {
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [planExpanded, setPlanExpanded] = useState(true);
  const grouped = groupByDate(conversations);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm border border-white/[0.08]"
            style={{ backgroundColor: BRAND.logo.background }}
          >
            <Compass
              className="w-4 h-4 shrink-0"
              style={{ color: BRAND.logo.electricBlue }}
              strokeWidth={2.4}
              aria-hidden
            />
          </div>
          <span className="text-[14px] font-bold text-[var(--text-strong)] tracking-tight">
            {BRAND.name}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3 flex-shrink-0">
        <button onClick={() => { onNewChat(); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all duration-150 group">
          <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-strong)] transition-colors" />
          새 대화 시작
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-2 overscroll-contain">
        {isLoadingHistory ? (
          <div className="px-3 py-6 flex flex-col items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand-trust-blue)] animate-spin" />
            <span className="text-[11px] text-[var(--text-muted)]">대화 기록 불러오는 중…</span>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] px-3 py-4 text-center">대화 기록이 없어요</p>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-2 mb-1.5">{group.label}</p>
              {group.items.map((conv) => (
                <div key={conv.id} className="relative group"
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}>
                  <button
                    onClick={() => { onSelectConv(conv.id); onClose?.(); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all duration-150 ${
                      activeConvId === conv.id
                        ? "bg-[var(--brand-primary-soft)] text-[var(--text-strong)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)]"
                    }`}>
                    <span className="block truncate pr-6">{conv.title}</span>
                  </button>
                  {hoveredConv === conv.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConv(conv.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-soft)] transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* My Plans */}
      <div className="border-t border-[var(--border-default)] px-2 pt-3 pb-4 flex-shrink-0">
        <button onClick={() => setPlanExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-[var(--brand-trust-blue)]" />
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">나의 플랜</span>
            {savedPlans.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]">{savedPlans.length}</span>
            )}
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${planExpanded ? "rotate-90" : ""}`} />
        </button>
        {planExpanded && (
          <div className="space-y-0.5">
            {savedPlans.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)] px-3 py-2">저장된 플랜이 없어요.</p>
            ) : (
              savedPlans.map((sp) => (
                <div key={sp.id} className="flex items-center gap-1">
                  <button
                    onClick={() => { onSelectPlan(sp); onClose?.(); }}
                    className="flex-1 text-left px-3 py-2 rounded-xl text-[12px] text-[var(--text-secondary)] hover:bg-[var(--brand-trust-blue-soft)] hover:text-[var(--brand-trust-blue)] transition-all duration-150">
                    <span className="block font-medium truncate">{sp.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {sp.region} · {new Date(sp.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </button>
                  <button onClick={() => onOpenMap(sp.plan)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-trust-blue)] hover:bg-[var(--brand-trust-blue-soft)] transition-all flex-shrink-0"
                    title="지도에서 보기">
                    <Map className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function V5ChatShell() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const user = useAuthUser();
  // undefined = 아직 확인 전, null = 비로그인, User = 로그인
  const userId = user?.id ?? null;
  const isAuthLoading = user === undefined;

  // ── Core State ───────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([makeGuestConv()]);
  const [activeConvId, setActiveConvIdRaw] = useState<string>(conversations[0].id);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [savedPlanIds, setSavedPlanIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [routeGeneratingMessageId, setRouteGeneratingMessageId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarTabletInitRef = useRef(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mapModalPlan, setMapModalPlan] = useState<TravelPlan | null>(null);
  const [chatHeaderMenuOpen, setChatHeaderMenuOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalFocus, setPricingModalFocus] = useState<PricingModalFocus>("overview");
  const [composerFocused, setComposerFocused] = useState(false);
  const [keyboardOverlapPx, setKeyboardOverlapPx] = useState(0);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const isLg = useLgUp();
  const [hybridDraft, setHybridDraft] = useState(HYBRID_TRIP_EMPTY);
  const [mobileFreeInput, setMobileFreeInput] = useState(false);
  /** 입력 독(하이브리드·자유입력) 접기/펼치기 — 모바일·태블릿·데스크톱 공통 */
  const [composerDockExpanded, setComposerDockExpanded] = useState(true);
  const [mobilePlanFullscreenOpen, setMobilePlanFullscreenOpen] = useState(false);
  const [composerDesktopMode, setComposerDesktopMode] = useState<"picker" | "free">("picker");

  const promptChecklist = useMemo(() => evaluateTravelPromptChecklist(inputValue), [inputValue]);
  const showFreeComposerGuide = useMemo(
    () => (isLg && composerDesktopMode === "free") || (!isLg && mobileFreeInput),
    [isLg, composerDesktopMode, mobileFreeInput],
  );
  const showComposerGuide =
    showFreeComposerGuide && (composerFocused || inputValue.trim().length > 0);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const chatHeaderMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const streamRafRef = useRef<number | null>(null);
  const streamBufferRef = useRef("");
  const streamMsgIdRef = useRef<string | null>(null);
  const streamConvIdRef = useRef<string | null>(null);
  // 마지막으로 데이터를 로드한 userId (재로드 방지)
  const loadedForUserRef = useRef<string | null>(undefined as unknown as null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const streamWaitingForFirstToken = useMemo(() => {
    const msgs = activeConv?.messages;
    if (!msgs?.length) return false;
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant" || !last.isStreaming) return false;
    return !String(last.content ?? "").trim();
  }, [activeConv?.messages]);

  const showTravelAnalysisLoading = Boolean(
    isTyping || routeGeneratingMessageId || streamWaitingForFirstToken,
  );

  useEffect(() => {
    if (!chatHeaderMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = chatHeaderMenuRef.current;
      if (el && !el.contains(e.target as Node)) setChatHeaderMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [chatHeaderMenuOpen]);

  const openPricing = useCallback((focus: PricingModalFocus) => {
    setPricingModalFocus(focus);
    setPricingModalOpen(true);
    setChatHeaderMenuOpen(false);
  }, []);

  // ── 로그인 시 DB에서 대화 기록 + 저장 플랜 복원 ─────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;

    // 비로그인: 이미 게스트 상태이면 그대로
    if (!userId) {
      if (loadedForUserRef.current !== null) {
        // 로그아웃됨 → 게스트 초기화
        const guest = makeGuestConv();
        setConversations([guest]);
        setActiveConvIdRaw(guest.id);
        setSavedPlans([]);
        setSavedPlanIds(new Set());
        loadedForUserRef.current = null;
      }
      return;
    }

    // 이미 이 userId로 로드한 경우 skip
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;

    setIsLoadingHistory(true);

    void Promise.all([
      loadConversations(userId),
      loadSavedPlans(userId),
    ]).then(([dbConvs, dbPlans]) => {
      // 대화 목록 복원
      if (dbConvs.length > 0) {
        const uiConvs = dbConvs.map(dbConvToConv);
        setConversations(uiConvs);
        setActiveConvIdRaw(uiConvs[0].id);
      } else {
        // DB에 대화 없음 → 새 대화 1개 생성
        void createConversation(userId, "새 대화").then((created) => {
          if (!created) return;
          const conv = dbConvToConv(created);
          conv.messages = [makeWelcomeMsg()];
          conv.messagesLoaded = true;
          setConversations([conv]);
          setActiveConvIdRaw(conv.id);
        });
      }

      // 저장 플랜 복원
      if (dbPlans.length > 0) {
        const uiPlans = dbPlans.map(dbPlanToSaved);
        setSavedPlans(uiPlans);
        setSavedPlanIds(new Set(uiPlans.map((p) => p.plan.id)));
      }

      setIsLoadingHistory(false);
    });
  }, [userId, isAuthLoading]);

  // ── 대화 전환 시 메시지 lazy-load ────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv || conv.messagesLoaded) return;

    void loadMessages(activeConvId).then((dbMsgs) => {
      const msgs: Message[] = dbMsgs.length > 0
        ? dbMsgs.map(dbMsgToMessage)
        : [makeWelcomeMsg()]; // 새 대화는 웰컴 메시지
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, messages: msgs, messagesLoaded: true } : c
        )
      );
    });
  }, [activeConvId, userId, conversations]);

  // ── 대화 전환 (로그인 유저는 messages 로드 필요 표시) ─────────────────────────
  const setActiveConvId = useCallback((id: string) => {
    setActiveConvIdRaw(id);
  }, []);

  const flushStreamBufferToConversations = useCallback(() => {
    const id = streamMsgIdRef.current;
    const convId = streamConvIdRef.current;
    const text = streamBufferRef.current;
    if (!id || !convId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === id ? { ...m, content: text } : m
          ),
        };
      })
    );
  }, []);

  const scheduleStreamFlush = useCallback(() => {
    if (streamRafRef.current != null) return;
    streamRafRef.current = requestAnimationFrame(() => {
      streamRafRef.current = null;
      flushStreamBufferToConversations();
    });
  }, [flushStreamBufferToConversations]);

  const finalizeStreamRaf = useCallback(() => {
    if (streamRafRef.current != null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
    flushStreamBufferToConversations();
  }, [flushStreamBufferToConversations]);

  useEffect(() => {
    return () => {
      if (streamRafRef.current != null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
    };
  }, []);

  // ── 메시지 영역 하단 고정 (조회 중·동선 카드가 입력창 안이 아니라 스크롤 영역에 보이도록) ──
  useLayoutEffect(() => {
    const root = messagesScrollRef.current;
    if (!root) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.scrollTop = root.scrollHeight;
      });
    });
  }, [
    activeConv?.id,
    activeConv?.messages,
    isTyping,
    routeGeneratingMessageId,
    showTravelAnalysisLoading,
  ]);

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputValue]);

  // ── Body scroll lock (mobile sidebar) ────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  /** 태블릿(md~lg): 최초 진입 시 좌측 대화 목록 접힌 상태(아이콘 레일만). 데스크톱은 펼침 유지. */
  useLayoutEffect(() => {
    if (sidebarTabletInitRef.current) return;
    sidebarTabletInitRef.current = true;
    if (typeof window === "undefined") return;
    const tabletChat = window.matchMedia("(min-width: 768px) and (max-width: 1023.98px)");
    if (tabletChat.matches) setSidebarCollapsed(true);
  }, []);

  // ── 모바일: visualViewport로 키보드 가림 보정 ─────────────────────────────
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const ih = window.innerHeight;
      const overlap = ih - (vv.height + vv.offsetTop);
      setKeyboardOverlapPx(Math.max(0, Math.round(overlap)));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem(V5_COMPOSER_MODE_STORAGE_KEY);
      if (v === "picker" || v === "free") setComposerDesktopMode(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setDesktopComposerMode = useCallback((mode: "picker" | "free") => {
    setComposerDesktopMode(mode);
    try {
      localStorage.setItem(V5_COMPOSER_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--v5-keyboard-overlap",
      `${keyboardOverlapPx}px`,
    );
  }, [keyboardOverlapPx]);

  const persistAssistantMessage = useCallback(
    (aiMsg: Message, activeId: string) => {
      if (!userId) return;
      const payload = assistantTravelPlanForDb(aiMsg);
      void saveMessage(activeId, "assistant", aiMsg.content, payload).then((saved) => {
        if (!saved) return;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === aiMsg.id ? { ...m, id: saved.id, dbId: saved.id } : m
              ),
            };
          })
        );
      });
    },
    [userId]
  );

  // ── handleSend ────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content || isTyping || routeGeneratingMessageId || !activeConvId) return;
      setComposerDockExpanded(false);
      setInputValue("");

      const priorMsgs = conversations.find((c) => c.id === activeConvId)?.messages ?? [];
      const isFirstUserMsg = priorMsgs.filter((m) => m.role === "user").length === 0;
      const newTitle = isFirstUserMsg
        ? content.slice(0, 28) + (content.length > 28 ? "…" : "")
        : null;

      const userMsg: Message = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          return {
            ...c,
            title: newTitle ?? c.title,
            messages: [...c.messages, userMsg],
          };
        })
      );

      if (userId) {
        void saveMessage(activeConvId, "user", content).then((saved) => {
          if (!saved) return;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === userMsg.id ? { ...m, id: saved.id, dbId: saved.id } : m
                ),
              };
            })
          );
        });
        if (newTitle) void updateConversationTitle(activeConvId, newTitle);
      }

      const convId = activeConvId;

      if (userId) {
        setIsTyping(true);
        let res: Response | null = null;
        try {
          res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: content }),
          });
        } catch {
          res = null;
        }

        const ct = res?.headers.get("content-type") ?? "";
        const canStream = Boolean(
          res?.ok && res.body && ct.includes("text/event-stream")
        );

        if (canStream && res?.body) {
          const aiMsgId = `tmp-ai-${Date.now()}`;
          streamMsgIdRef.current = aiMsgId;
          streamConvIdRef.current = convId;
          streamBufferRef.current = "";

          setConversations((prev) =>
            prev.map((c) =>
              c.id !== convId
                ? c
                : {
                    ...c,
                    messages: [
                      ...c.messages,
                      {
                        id: aiMsgId,
                        role: "assistant",
                        content: "",
                        timestamp: new Date(),
                        isStreaming: true,
                      },
                    ],
                  }
            )
          );
          setIsTyping(false);

          const reader = res.body.getReader();
          const result = await consumeTravelChatSse(reader, (delta) => {
            streamBufferRef.current += delta;
            scheduleStreamFlush();
          });

          finalizeStreamRaf();

          streamMsgIdRef.current = null;
          streamConvIdRef.current = null;
          const finalText = streamBufferRef.current.trim();
          streamBufferRef.current = "";

          if (!result.ok) {
            const errMsg =
              result.message ||
              (result.code === "ABORTED"
                ? "요청이 취소되었습니다."
                : "응답을 받지 못했습니다.");
            const errContent = finalText
              ? `${finalText}\n\n[${errMsg}]`
              : errMsg;
            const aiErr: Message = {
              id: aiMsgId,
              role: "assistant",
              content: errContent,
              timestamp: new Date(),
            };
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsgId ? { ...aiErr, isStreaming: false } : m
                  ),
                };
              })
            );
            setIsTyping(false);
            return;
          }

          let displayText = finalText;
          if (result.warning) {
            displayText = displayText
              ? `${displayText}\n\n⚠ ${result.warning}`
              : `⚠ ${result.warning}`;
          }
          if (!displayText) displayText = "응답이 비어 있습니다.";

          const aiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: displayText,
            timestamp: new Date(),
          };

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMsgId ? { ...aiMsg, isStreaming: false } : m
                ),
              };
            })
          );

          persistAssistantMessage(aiMsg, convId);
          setIsTyping(false);
          return;
        }
      }

      const promptCheck = evaluateTravelPromptChecklist(content);
      if (!isGatherQueryReady(promptCheck)) {
        const quickChips = buildQuickPreferenceChips(content, promptCheck);
        const quickAi: Message = {
          id: `tmp-ai-quick-${Date.now()}`,
          role: "assistant",
          content:
            "지역과 일정(기간)이 함께 있어야 AI 조회로 조건을 정리할 수 있어요. 아래 칩을 확인·수정한 뒤 「이 정보로 동선 짜기」를 눌러 주세요. (로컬 동선만 — 출발·귀경지는 사용하지 않아요.)",
          timestamp: new Date(),
          preferenceChips: quickChips,
          canGenerateRoute: false,
        };
        setConversations((prev) =>
          prev.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, quickAi] })),
        );
        persistAssistantMessage(quickAi, convId);
        return;
      }

      setIsTyping(true);

      const apiMessages = messagesToApiPayload([...priorMsgs, userMsg]);

      type ApiV5 = {
        content?: string;
        preferenceChips?: PreferenceChip[] | null;
        readyToGenerateRoute?: boolean;
        travelPlan?: TravelPlan | null;
      };

      let data: ApiV5;
      try {
        const res = await fetch("/api/v5/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });
        if (!res.ok) throw new Error(`chat ${res.status}`);
        data = (await res.json()) as ApiV5;
      } catch {
        const { content: aiContent, plan } = getMockResponse(content);
        data = {
          content: aiContent,
          preferenceChips: null,
          readyToGenerateRoute: false,
          travelPlan: plan ?? null,
        };
      }

      const hasPlan = data.travelPlan && Array.isArray(data.travelPlan.spots);
      const chips =
        !hasPlan && data.preferenceChips && data.preferenceChips.length > 0
          ? data.preferenceChips
          : undefined;

      const aiMsg: Message = {
        id: `tmp-ai-${Date.now()}`,
        role: "assistant",
        content: data.content ?? "",
        timestamp: new Date(),
        travelPlan: hasPlan ? (data.travelPlan as TravelPlan) : undefined,
        preferenceChips: chips,
        canGenerateRoute: hasPlan ? undefined : Boolean(data.readyToGenerateRoute),
      };

      setConversations((prev) =>
        prev.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, aiMsg] }))
      );
      setIsTyping(false);

      persistAssistantMessage(aiMsg, convId);
    },
    [
      inputValue,
      isTyping,
      routeGeneratingMessageId,
      activeConvId,
      userId,
      conversations,
      persistAssistantMessage,
      scheduleStreamFlush,
      finalizeStreamRaf,
    ]
  );

  const submitHybrid = useCallback(() => {
    const text = buildHybridPrompt(hybridDraft);
    if (!text.trim() || !hybridHasMinimumForSend(hybridDraft)) return;
    setHybridDraft({ ...HYBRID_TRIP_EMPTY });
    void handleSend(text);
  }, [hybridDraft, handleSend]);

  const handleConfirmRoute = useCallback(
    async (chipSourceMessageId: string, slots: PreferenceChip[]) => {
      const slotsFiltered = slots.filter((s) => !isDeparturePreferenceChip(s));
      if (!slotsFiltered.length || isTyping || routeGeneratingMessageId || !activeConvId) return;

      setComposerDockExpanded(false);

      const userContent = "확정한 조건으로 여행 동선을 짜줘.";
      const userMsg: Message = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: userContent,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeConvId ? c : { ...c, messages: [...c.messages, userMsg] }
        )
      );

      if (userId) {
        void saveMessage(activeConvId, "user", userContent).then((saved) => {
          if (!saved) return;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === userMsg.id ? { ...m, id: saved.id, dbId: saved.id } : m
                ),
              };
            })
          );
        });
      }

      setRouteGeneratingMessageId(chipSourceMessageId);
      setIsTyping(true);

      // gather(조건 정리)는 Step 1에서만 호출됨. 동선 생성은 confirmRoute 분기(plan 스키마)만 타며
      // 대화 전체를 다시 넘기지 않아 이중 gather·불필요한 토큰을 피함.
      const planRequestMessages: { role: "user" | "assistant"; content: string }[] = [];

      type ApiV5 = {
        content?: string;
        travelPlan?: TravelPlan | null;
      };

      let data: ApiV5;
      try {
        const res = await fetch("/api/v5/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: planRequestMessages,
            confirmRoute: { slots: slotsFiltered },
          }),
        });
        if (!res.ok) throw new Error(`chat ${res.status}`);
        data = (await res.json()) as ApiV5;
      } catch {
        const synthetic = slotsFiltered.map((s) => s.value).join(" ");
        const { content: aiContent, plan } = getMockResponse(synthetic);
        data = { content: aiContent, travelPlan: plan ?? null };
      }

      const hasPlan = data.travelPlan && Array.isArray(data.travelPlan.spots);
      const aiMsg: Message = {
        id: `tmp-ai-${Date.now()}`,
        role: "assistant",
        content:
          data.content ??
          (hasPlan ? "요청하신 조건으로 동선을 구성했어요." : "동선을 만들지 못했어요. 다시 시도해 주세요."),
        timestamp: new Date(),
        travelPlan: hasPlan ? (data.travelPlan as TravelPlan) : undefined,
      };

      setConversations((prev) =>
        prev.map((c) => (c.id !== activeConvId ? c : { ...c, messages: [...c.messages, aiMsg] }))
      );
      setIsTyping(false);
      setRouteGeneratingMessageId(null);

      persistAssistantMessage(aiMsg, activeConvId);
    },
    [activeConvId, isTyping, routeGeneratingMessageId, userId, persistAssistantMessage]
  );

  // ── handleNewChat ─────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (userId) {
      // DB에 대화 생성 후 UI 반영
      void createConversation(userId, "새 대화").then((created) => {
        if (!created) return;
        const conv = dbConvToConv(created);
        conv.messages = [makeWelcomeMsg()];
        conv.messagesLoaded = true;
        setConversations((prev) => [conv, ...prev]);
        setActiveConvId(conv.id);
      });
    } else {
      // 게스트: 로컬 상태만
      const conv = makeGuestConv();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
    }
  }, [userId, setActiveConvId]);

  // ── handleDeleteConv ──────────────────────────────────────────────────────
  const handleDeleteConv = useCallback((id: string) => {
    if (userId) void dbDeleteConversation(id);

    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        if (userId) {
          // DB에 새 대화 생성
          void createConversation(userId, "새 대화").then((created) => {
            if (!created) return;
            const conv = dbConvToConv(created);
            conv.messages = [makeWelcomeMsg()];
            conv.messagesLoaded = true;
            setConversations([conv]);
            setActiveConvId(conv.id);
          });
          return [];
        }
        const conv = makeGuestConv();
        setActiveConvId(conv.id);
        return [conv];
      }
      if (id === activeConvId) setActiveConvId(remaining[0].id);
      return remaining;
    });
  }, [userId, activeConvId, setActiveConvId]);

  // ── handleSavePlan ────────────────────────────────────────────────────────
  const handleSavePlan = useCallback((plan: TravelPlan) => {
    if (savedPlanIds.has(plan.id)) return;

    const sp: SavedPlan = {
      id: `local-${Date.now()}`,
      title: plan.title,
      region: plan.region,
      savedAt: new Date(),
      plan,
      fromConversationId: activeConvId,
    };

    // UI 즉시 반영
    setSavedPlans((prev) => [sp, ...prev]);
    setSavedPlanIds((prev) => new Set([...prev, plan.id]));

    // DB 저장 (로그인 시)
    if (userId) {
      void savePlanToDB(userId, activeConvId, plan as unknown as Record<string, unknown> & { id: string; title: string; region: string })
        .then((saved) => {
          if (!saved) return;
          setSavedPlans((prev) =>
            prev.map((p) => (p.id === sp.id ? { ...p, id: saved.id, dbId: saved.id } : p))
          );
        });
    }
  }, [savedPlanIds, activeConvId, userId]);

  // ── handleSelectPlan ──────────────────────────────────────────────────────
  const handleSelectPlan = useCallback((sp: SavedPlan) => {
    const conv = conversations.find((c) => c.id === sp.fromConversationId);
    if (conv) setActiveConvId(conv.id);
  }, [conversations, setActiveConvId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const messages = activeConv?.messages ?? [];
  const hasUserMessage = messages.some((m) => m.role === "user");

  const latestPlanForSplitPanel = useMemo((): TravelPlan | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.role === "assistant" && m.travelPlan) return m.travelPlan;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!latestPlanForSplitPanel) setMobilePlanFullscreenOpen(false);
  }, [latestPlanForSplitPanel]);

  const composerKeyboardTight =
    composerFocused && keyboardOverlapPx >= 72 && isNarrowViewport;

  const showHybridComposer =
    (isLg && composerDesktopMode === "picker") || (!isLg && !mobileFreeInput);
  const showFreeComposer =
    (isLg && composerDesktopMode === "free") || (!isLg && mobileFreeInput);
  const composerBusy = isTyping || Boolean(routeGeneratingMessageId);
  const composerDockCompact = !composerDockExpanded;

  const sidebarProps = {
    conversations, savedPlans, activeConvId,
    onSelectConv: setActiveConvId, onNewChat: handleNewChat,
    onDeleteConv: handleDeleteConv, onSelectPlan: handleSelectPlan,
    onOpenMap: setMapModalPlan, isLoadingHistory,
  };

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-[var(--bg-page)]">
        {/* ── Desktop Sidebar ─────────────────────────────────── */}
        <div className={`hidden md:flex flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-12" : "w-[260px]"}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <button onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all"
                title="사이드바 열기"><PanelLeft className="w-4 h-4" /></button>
              <button onClick={handleNewChat}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all"
                title="새 대화"><Plus className="w-4 h-4" /></button>
            </div>
          ) : (
            <SidebarContent {...sidebarProps} onClose={undefined} />
          )}
        </div>

        {/* ── Mobile Sidebar Drawer ────────────────────────────── */}
        {mobileSidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(10,10,10,0.4)", backdropFilter: "blur(2px)" }}
              onClick={() => setMobileSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--bg-surface)] flex flex-col md:hidden shadow-2xl"
              style={{ borderRadius: "0 24px 24px 0" }}>
              <SidebarContent {...sidebarProps} onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* ── Main Chat (태블릿 가로: 우측 타임라인·지도 패널) ── */}
        <div className="v5-chat-split-root flex-1 flex flex-col min-w-0 min-h-0 h-full">
          <div className="v5-chat-split-chat flex flex-col min-w-0 min-h-0 flex-1 h-full overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 md:py-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0 min-h-[52px]">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-all">
                <Menu className="w-5 h-5" />
              </button>
              {!sidebarCollapsed ? (
                <button onClick={() => setSidebarCollapsed(true)}
                  className="hidden md:flex w-8 h-8 rounded-xl items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-all">
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setSidebarCollapsed(false)}
                  className="hidden md:flex w-8 h-8 rounded-xl items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-all">
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-[14px] font-semibold text-[var(--text-strong)] truncate">
                {hasUserMessage ? activeConv?.title : `${BRAND.name} · 여행 동선`}
              </span>
            </div>
            <div ref={chatHeaderMenuRef} className="flex items-center gap-2 relative">
              <AppleThemeToggle />
              {!isLg && latestPlanForSplitPanel && (
                <button
                  type="button"
                  onClick={() => setMobilePlanFullscreenOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--brand-trust-blue)]/35 bg-[var(--brand-trust-blue-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--brand-trust-blue)] hover:bg-[color-mix(in_srgb,var(--brand-trust-blue)_18%,var(--bg-surface))] touch-manipulation"
                  title="동선 타임라인 전체 보기"
                >
                  <Map className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  내 플랜
                </button>
              )}
              {!isAuthLoading && (
                <button
                  type="button"
                  onClick={() =>
                    openPricing(userId ? "overview" : "guest")
                  }
                  className={`inline-flex items-center shrink-0 whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-90 ${
                    userId
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] ring-1 ring-[var(--border-default)]"
                  }`}
                  title="요금제·이용 안내"
                >
                  {userId ? "동기화 중" : "게스트"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setChatHeaderMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-all"
                aria-expanded={chatHeaderMenuOpen}
                aria-haspopup="menu"
                aria-label="채팅 메뉴"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {chatHeaderMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)]"
                    onClick={() => openPricing("overview")}
                  >
                    요금제·이용 한도
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)]"
                    onClick={() => openPricing("api")}
                  >
                    외부 API·비용 안내
                  </button>
                  {!userId && (
                    <Link
                      href="/login?next=/chat"
                      className="block px-3 py-2.5 text-[13px] font-medium text-[var(--brand-trust-blue)] hover:bg-[var(--brand-trust-blue-soft)]"
                      role="menuitem"
                      onClick={() => setChatHeaderMenuOpen(false)}
                    >
                      로그인
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-1 md:pt-2">
            <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* 메시지 로드 중 (대화 전환 후 DB 로드 전) */}
              {activeConv && !activeConv.messagesLoaded && userId ? (
                <div className="flex flex-1 flex-col items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand-trust-blue)]" />
                    <span className="text-[12px] text-[var(--text-muted)]">메시지 불러오는 중…</span>
                  </div>
                </div>
              ) : !hasUserMessage ? (
                <EmptyState
                  onApplyPrompt={(text) => {
                    setInputValue(text);
                    if (isLg) setDesktopComposerMode("free");
                    else setMobileFreeInput(true);
                    queueMicrotask(() => {
                      textareaRef.current?.focus();
                      textareaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    });
                  }}
                  onOpenPricing={() => openPricing("overview")}
                  onScrollToComposer={() => {
                    setComposerDockExpanded(true);
                    composerShellRef.current?.scrollIntoView({
                      block: "end",
                      behavior: "smooth",
                    });
                  }}
                  hybridDraft={hybridDraft}
                  onHybridDraftChange={setHybridDraft}
                  onSubmitHybridFromCard={() => {
                    submitHybrid();
                  }}
                  composerBusy={composerBusy}
                />
              ) : (
                <div className="mx-auto max-w-[720px] space-y-5 px-4 py-7 md:px-5 md:py-8">
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      savedPlanIds={savedPlanIds}
                      onSavePlan={handleSavePlan}
                      onViewMap={setMapModalPlan}
                      onConfirmRoute={handleConfirmRoute}
                      routeGeneratingMessageId={routeGeneratingMessageId}
                    />
                  ))}
                  {showTravelAnalysisLoading && (
                    <div className="flex w-full justify-start">
                      <V5TravelAiAnalysisLoadingOverlay
                        open
                        variant="chat-row"
                        phase={routeGeneratingMessageId ? "plan" : "gather"}
                        className="max-w-[min(100%,85%)]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Input Bar */}
          <div
            id="wayly-trip-composer"
            ref={composerShellRef}
            className={`wayly-trip-composer-anchor v5-composer-dock v5-composer-liquid-dock flex-shrink-0 scroll-mt-4 transition-[padding] duration-150 ease-out ${
              composerKeyboardTight
                ? "v5-composer-keyboard-tight"
                : composerDockCompact
                  ? "px-4 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:px-5 lg:pt-3 lg:pb-3"
                  : "px-5 pb-6 md:pb-8 pt-5 md:pt-7"
            }`}
          >
            <div className="max-w-[720px] mx-auto space-y-3">
              {composerDockCompact && (
                <button
                  type="button"
                  onClick={() => setComposerDockExpanded(true)}
                  className="v5-composer-liquid-panel flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left touch-manipulation active:scale-[0.99] transition-transform"
                  aria-expanded={false}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]">
                      <ChevronUp className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--text-strong)] leading-tight">
                        여행 조건 입력
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                        탭하면 칩·키보드 입력을 펼칩니다
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--brand-trust-blue)]">
                    펼치기
                  </span>
                </button>
              )}

              {composerDockExpanded && (
                <>
              <div className="hidden lg:flex items-center justify-between gap-3 px-0.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)] tracking-tight shrink-0">
                  입력 방식
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <div
                    className="v5-composer-liquid-panel inline-flex shrink-0 rounded-xl p-1"
                    role="tablist"
                    aria-label="입력 방식 전환"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerDesktopMode === "picker"}
                      onClick={() => setDesktopComposerMode("picker")}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        composerDesktopMode === "picker"
                          ? "bg-[var(--bg-elevated)] text-[var(--text-strong)] shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                      }`}
                    >
                      간편 선택
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerDesktopMode === "free"}
                      onClick={() => setDesktopComposerMode("free")}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        composerDesktopMode === "free"
                          ? "bg-[var(--bg-elevated)] text-[var(--text-strong)] shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                      }`}
                    >
                      자유 입력
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposerDockExpanded(false)}
                    className="v5-composer-liquid-panel flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors"
                    aria-expanded={composerDockExpanded}
                    title="입력 영역 접기"
                  >
                    <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                    접기
                  </button>
                </div>
              </div>

              <div className="flex lg:hidden items-center justify-between gap-2 px-0.5">
                <button
                  type="button"
                  onClick={() => setComposerDockExpanded(false)}
                  className="flex shrink-0 items-center gap-1 rounded-xl border border-transparent px-2 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-strong)] touch-manipulation"
                  aria-expanded={composerDockExpanded}
                  title="입력 영역 접기"
                >
                  <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                  접기
                </button>
                <span className="min-w-0 flex-1 text-center text-[11px] font-medium text-[var(--text-muted)] truncate">
                  선택 입력 기본
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFreeInput((v) => !v)}
                  className="shrink-0 max-w-[48%] text-right text-[12px] font-semibold text-[var(--brand-trust-blue)] touch-manipulation"
                >
                  {mobileFreeInput ? "선택 모드" : "키보드 입력"}
                </button>
              </div>

              {showComposerGuide && (
                <div
                  className="v5-composer-guide-box v5-composer-liquid-guide rounded-2xl px-3 py-2.5 md:px-4 md:py-3.5 transition-all duration-200 ease-out"
                  role="status"
                  aria-live="polite"
                  aria-label="입력 가이드"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 md:mb-2.5">
                    <p className="text-[11px] md:text-[12px] font-medium text-[var(--text-muted)] tracking-tight">
                      알려주시면 동선 짜기가 수월해요
                    </p>
                    <span className="md:hidden text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/80 shrink-0">
                      스와이프
                    </span>
                  </div>
                  <div className="v5-prompt-chips-strip overflow-x-auto -mx-1 px-1 pb-0.5 touch-pan-x">
                    <ul
                      className="flex flex-nowrap gap-2 pr-4 list-none m-0 p-0 w-max max-w-none"
                      role="list"
                      aria-label="여행 조건 체크 항목"
                    >
                      {TRAVEL_PROMPT_CHECKLIST.map(({ key, label, hint }) => {
                        const done = promptChecklist[key];
                        return (
                          <li
                            key={key}
                            className={`v5-prompt-chip-item flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 min-h-[42px] max-w-[min(200px,78vw)] snap-start transition-colors duration-150 touch-manipulation ${
                              done
                                ? "border-[var(--success)]/35 bg-[var(--success-soft)] text-[var(--text-strong)]"
                                : "border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/90 text-[var(--text-muted)]"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                                done
                                  ? "border-[var(--success)] bg-[var(--success)] text-white"
                                  : "border-[var(--border-strong)] bg-transparent"
                              }`}
                              aria-hidden
                            >
                              {done && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="min-w-0 text-left leading-tight">
                              <span className="block text-[12px] md:text-[13px] font-semibold truncate">{label}</span>
                              <span className="block text-[9px] md:text-[10px] opacity-80 font-normal truncate">{hint}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {showHybridComposer && (
                <HybridTripComposer
                  draft={hybridDraft}
                  onDraftChange={setHybridDraft}
                  onSubmit={submitHybrid}
                  disabled={composerBusy}
                  showSendButton
                />
              )}

              {showFreeComposer && (
                <div className="v5-composer-input-shell v5-composer-liquid-input flex items-end gap-2.5 px-4 py-3.5 md:px-5 md:py-4 rounded-[1.25rem] focus-within:ring-2 focus-within:ring-[var(--brand-trust-blue)]/25 focus-within:border-[var(--brand-trust-blue)]/50 transition-all duration-200 touch-manipulation">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      setComposerFocused(true);
                      if (
                        !isNarrowViewport &&
                        !composerBusy &&
                        !showTravelAnalysisLoading
                      ) {
                        requestAnimationFrame(() => {
                          composerShellRef.current?.scrollIntoView({
                            block: "end",
                            behavior: "smooth",
                          });
                        });
                      }
                    }}
                    onBlur={() => setComposerFocused(false)}
                    enterKeyHint="send"
                    placeholder="지역·구역·일정·인원·교통 등을 알려주세요 (예: 전주 한옥마을 당일 도보 맛집·카페)"
                    rows={1}
                    className="flex-1 bg-transparent resize-none outline-none text-base lg:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed py-1 min-h-[22px] touch-manipulation"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || composerBusy}
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
                      inputValue.trim() && !composerBusy
                        ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-95 shadow-sm"
                        : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showFreeComposer && (
                <>
                  <p className="v5-composer-footnote text-center text-[11px] text-[var(--text-muted)] mt-1 hidden md:block">
                    Enter로 전송 · Shift+Enter 줄바꿈 ·{" "}
                    <button
                      type="button"
                      onClick={() => openPricing("overview")}
                      className="text-[var(--brand-trust-blue)] font-medium hover:underline underline-offset-2"
                    >
                      요금·한도 안내
                    </button>
                  </p>
                  <p className="v5-composer-footnote text-center text-[10px] text-[var(--text-muted)] mt-1.5 md:hidden px-2">
                    무료 한도는 정책에 따라 달라질 수 있어요.{" "}
                    <button
                      type="button"
                      onClick={() => openPricing("overview")}
                      className="text-[var(--brand-trust-blue)] font-medium"
                    >
                      요금 안내
                    </button>
                  </p>
                </>
              )}
                </>
              )}
            </div>
          </div>
          </div>

          <TabletPlanPreviewPane
            plan={latestPlanForSplitPanel}
            isSaved={
              latestPlanForSplitPanel
                ? savedPlanIds.has(latestPlanForSplitPanel.id)
                : false
            }
            onSave={handleSavePlan}
            onViewMap={setMapModalPlan}
          />
        </div>
      </div>

      {mapModalPlan && (
        <V5PlanMapModal plan={mapModalPlan} onClose={() => setMapModalPlan(null)} />
      )}

      {!isLg && latestPlanForSplitPanel && (
        <MobilePlanFullscreenOverlay
          open={mobilePlanFullscreenOpen}
          onClose={() => setMobilePlanFullscreenOpen(false)}
          plan={latestPlanForSplitPanel}
          isSaved={savedPlanIds.has(latestPlanForSplitPanel.id)}
          onSave={handleSavePlan}
          onViewMap={setMapModalPlan}
        />
      )}

      <V5ChatPricingModal
        open={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        focus={pricingModalFocus}
        isGuest={!userId}
      />
    </>
  );
}
