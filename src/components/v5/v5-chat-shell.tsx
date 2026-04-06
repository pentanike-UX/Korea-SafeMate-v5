"use client";

import Image from "next/image";
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Plus, MapPin, Clock, CloudSun, Bookmark, BookmarkCheck,
  Send, Utensils, Coffee, Train, Camera, ChevronRight,
  Sparkles, MoreHorizontal, Trash2, PanelLeftClose, PanelLeft,
  Navigation, Hotel, Menu, X, Map, Compass, Check, ChevronDown, ChevronUp,
  Search, ClipboardList, LogOut,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
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
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { AppleThemeToggle } from "@/components/theme/apple-theme-toggle";
import { V5ChatPricingModal, type PricingModalFocus } from "./v5-chat-pricing-modal";
import {
  HybridTripComposer,
  HYBRID_MULTI_KEYS,
  HYBRID_TRIP_EMPTY,
  SLOT_META,
  buildHybridPrompt,
  hybridHasMinimumForSend,
  parseHybridMultiValues,
  useLgUp,
  useV5TabletSplitLayout,
  type HybridTripKey,
} from "./v5-hybrid-trip-composer";
import { V5TravelAiAnalysisLoadingOverlay } from "./v5-travel-ai-analysis-loading";
import {
  mergePlanWithTourCoords,
  planHasAnyMapCoords,
  tourImageUnoptimized,
} from "@/lib/tour-api/tour-spot-client";
import { usePlanTourEnrichment } from "./use-plan-tour-enrichment";

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

function getRegionChipValue(chips: PreferenceChip[]): string | undefined {
  const c =
    chips.find((x) => x.id === "trip_region") ??
    chips.find((x) => /\b지역\b/.test(x.label) && x.id !== "trip_local_zone");
  return c?.value?.trim();
}

function getScheduleChipValue(chips: PreferenceChip[]): string | undefined {
  const c =
    chips.find((x) => x.id === "trip_schedule") ??
    chips.find((x) => /\b일정\b/.test(x.label));
  return c?.value?.trim();
}

/** 플레이스홀더·안내 문구만 있으면 동선 확정 불가 */
function isPlaceholderRouteChipValue(value: string | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (v.length < 2) return true;
  if (/^\(예[:：]/.test(v)) return true;
  if (/^지역명을/.test(v)) return true;
  if (/^박·일이나/.test(v)) return true;
  if (/^구역·동네를 칩에서/.test(v)) return true;
  if (v === "미정") return true;
  return false;
}

function routeChipCoreSlotsActionable(chips: PreferenceChip[]): boolean {
  return (
    !isPlaceholderRouteChipValue(getRegionChipValue(chips)) &&
    !isPlaceholderRouteChipValue(getScheduleChipValue(chips))
  );
}

/** 하이브리드에 남아 있는 지역·동선을 확정 슬롯에 반영(LLM이 광역만 남기거나 엉뚱한 시로 줄 때 보정) */
function enrichConfirmSlotsWithHybrid(
  slots: PreferenceChip[],
  hybrid: Record<HybridTripKey, string>,
): PreferenceChip[] {
  const hr = hybrid.region.trim();
  const hz = hybrid.zone.trim();
  const next = slots.map((s) => ({ ...s }));

  if (hr) {
    const regionIdx = next.findIndex(
      (c) => c.id === "trip_region" || /\b지역\b/.test(c.label),
    );
    const patch: PreferenceChip = {
      id: "trip_region",
      label: "여행 지역",
      value: hr,
      category: "위치",
    };
    if (regionIdx >= 0) {
      next[regionIdx] = {
        ...next[regionIdx]!,
        ...patch,
        label: next[regionIdx]!.label,
      };
    } else {
      next.unshift(patch);
    }
  }

  if (hz) {
    const zi = next.findIndex(
      (c) =>
        /\b동선\b/.test(c.label) ||
        /\b구역\b/.test(c.label) ||
        /코스/.test(c.label) ||
        c.id.includes("zone"),
    );
    const zoneChip: PreferenceChip = {
      id: "trip_zone_center",
      label: "동선 중심",
      value: hz,
      category: "위치",
    };
    if (zi >= 0) {
      next[zi] = { ...next[zi]!, ...zoneChip, label: next[zi]!.label };
    } else {
      next.splice(hr ? 1 : 0, 0, zoneChip);
    }
  }

  return next;
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

/** /api/v5/chat: 실패 시 4xx/5xx 또는 본문 ok:false → 사용자 메시지로 정규화(목 응답으로 덮어쓰지 않음) */
function normalizeV5ChatJson(
  res: Response,
  parsed: {
    ok?: boolean;
    content?: string;
    error?: string;
    preferenceChips?: PreferenceChip[] | null;
    readyToGenerateRoute?: boolean;
    travelPlan?: TravelPlan | null;
  },
): {
  content?: string;
  preferenceChips?: PreferenceChip[] | null;
  readyToGenerateRoute?: boolean;
  travelPlan?: TravelPlan | null;
} {
  if (!res.ok || parsed.ok === false) {
    const hint =
      parsed.content?.trim() ||
      parsed.error?.trim() ||
      `요청이 실패했어요${res.status ? ` (${res.status})` : ""}. 잠시 후 다시 시도해 주세요.`;
    return {
      content: hint,
      preferenceChips: null,
      readyToGenerateRoute: false,
      travelPlan: null,
    };
  }
  return {
    content: parsed.content,
    preferenceChips: parsed.preferenceChips ?? null,
    readyToGenerateRoute: parsed.readyToGenerateRoute,
    travelPlan: parsed.travelPlan ?? null,
  };
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
  const tourBySpotId = usePlanTourEnrichment(plan);
  const hasMapCoords = planHasAnyMapCoords(plan, tourBySpotId);

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
                    {!tour.alignsWithPlanName ? (
                      <p className="mt-1 text-[10px] leading-snug text-[var(--warning)]">
                        검색된 관광지명: <span className="font-medium">{tour.title}</span>
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          (플랜 이름과 다를 수 있어요)
                        </span>
                      </p>
                    ) : null}
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
          onClick={() =>
            hasMapCoords && onViewMap(mergePlanWithTourCoords(plan, tourBySpotId))
          }
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
  const tourBySpotId = usePlanTourEnrichment(plan);
  const hasMapCoords = planHasAnyMapCoords(plan, tourBySpotId);

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
          onClick={() =>
            hasMapCoords && onViewMap(mergePlanWithTourCoords(plan, tourBySpotId))
          }
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
  hybridSheetHostCallback,
}: {
  plan: TravelPlan | null;
  isSaved: boolean;
  onSave: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
  /** 하이브리드 칩 시트를 이 영역 위에 포털로 올릴 컨테이너 */
  hybridSheetHostCallback?: (el: HTMLDivElement | null) => void;
}) {
  if (!plan) {
    return (
      <aside
        className="v5-chat-split-preview border-l border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col min-h-0"
        aria-label="동선 미리보기"
      >
        <div
          ref={(el) => hybridSheetHostCallback?.(el)}
          className="relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden"
        >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8">
          {/* Skeleton timeline cards */}
          <div className="w-full max-w-[280px] space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-[var(--bg-surface-subtle)]/60 px-4 py-4 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--border-default)]/60" />
                <div className="flex-1 space-y-2">
                  <span className="block h-3 w-3/4 rounded bg-[var(--border-default)]/50" />
                  <span className="block h-2.5 w-1/2 rounded bg-[var(--border-default)]/30" />
                </div>
              </div>
            ))}
          </div>
          {/* Map skeleton */}
          <div className="w-full max-w-[280px] h-24 rounded-xl bg-[var(--bg-surface-subtle)]/60 animate-pulse flex items-center justify-center">
            <Map className="h-6 w-6 text-[var(--text-muted)]/25" aria-hidden />
          </div>
          <p className="text-[13px] text-[var(--text-muted)] text-center mt-1">
            동선을 생성하면 여기에 타임라인이 나타나요
          </p>
        </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="v5-chat-split-preview border-l border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col min-h-0 min-w-0"
      aria-label="지도 및 타임라인"
    >
      <div
        ref={(el) => hybridSheetHostCallback?.(el)}
        className="relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden"
      >
        <PlanPreviewTimelineBody
          plan={plan}
          isSaved={isSaved}
          onSave={onSave}
          onViewMap={onViewMap}
        />
      </div>
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

  const coreValuesActionable = useMemo(
    () => routeChipCoreSlotsActionable(displayChips),
    [displayChips],
  );

  const canSubmit =
    displayChips.length > 0 && hasCoreSlots && coreValuesActionable && !isGenerating;

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
        <strong className="font-semibold text-[var(--text-strong)]">선택한 지역 안에서만</strong> 로컬 동선으로 짭니다. 아래 값이 예시 문구가 아니라{" "}
        <strong className="font-semibold text-[var(--text-strong)]">실제 지역·일정</strong>인지 확인해 주세요. 하단{" "}
        <strong className="font-semibold text-[var(--text-strong)]">8가지 칩</strong>에서 고르거나 채팅으로 구체적으로 적은 뒤, 다시 조회해 받은 칩으로 동선을 확정할 수 있어요.
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
      {displayChips.length > 0 && hasCoreSlots && !coreValuesActionable && (
        <p className="mt-2 text-center text-[11px] text-[var(--warning)]">
          지역·일정이 &quot;(예: …)&quot; 같은 안내 문구로 남아 있어요. 하이브리드 입력에서 채우거나 채팅으로 알려 주세요.
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
  isGuest,
}: {
  message: Message;
  savedPlanIds: Set<string>;
  onSavePlan: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
  onConfirmRoute?: (messageId: string, slots: PreferenceChip[]) => void;
  routeGeneratingMessageId: string | null;
  isGuest?: boolean;
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
            {isGuest && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3">
                <span className="text-[13px] text-[var(--text-secondary)] flex-1">이 동선을 저장하려면 로그인하세요</span>
                <Link
                  href="/login?next=/chat"
                  className="shrink-0 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] transition-colors"
                >
                  Google로 로그인
                </Link>
              </div>
            )}
          </div>
        )}
        <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
          {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}


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

function EmptyState({
  onOpenPricing,
  onScrollToComposer,
}: {
  onOpenPricing: () => void;
  /** 화면 하단 하이브리드 칩 영역으로 스크롤 */
  onScrollToComposer: () => void;
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
      <p className="text-[14px] text-[var(--text-secondary)] text-center max-w-md leading-relaxed mb-6">
        아래 입력 영역에서{" "}
        <strong className="font-semibold text-[var(--text-strong)]">여행지</strong>와{" "}
        <strong className="font-semibold text-[var(--text-strong)]">일정</strong>을 먼저 골라주세요.
        나머지는 선택이에요.
      </p>

      <button
        type="button"
        onClick={onScrollToComposer}
        className="flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-6 py-3 text-[14px] font-semibold text-[var(--text-on-brand)] shadow-md hover:bg-[var(--brand-primary-hover)] active:scale-[0.98] transition-all touch-manipulation mb-6"
      >
        <MapPin className="h-4 w-4" />
        여행 조건 입력하기
      </button>

      <p className="text-[12px] text-[var(--text-muted)] text-center max-w-sm leading-relaxed mb-4">
        간편 선택(칩) 또는 자유 입력으로 조건을 알려주시면 AI가 동선을 짜드려요.
      </p>

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

function sidebarDisplayName(user: User | null | undefined, isAuthLoading: boolean): string {
  if (isAuthLoading) return "";
  if (!user) return "게스트";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const n = meta?.full_name?.trim() || meta?.name?.trim();
  if (n) return n.length > 14 ? `${n.slice(0, 13)}…` : n;
  if (user.email) {
    const local = user.email.split("@")[0] ?? user.email;
    return local.length > 14 ? `${local.slice(0, 13)}…` : local;
  }
  return "사용자";
}

function sidebarUserInitials(user: User | null | undefined, isAuthLoading: boolean): string {
  if (isAuthLoading) return "";
  if (!user) return "G";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const n = meta?.full_name?.trim() || meta?.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return "U";
}

/** ⋯ 메뉴: 테마 + 요금/API + 로그인/로그아웃 */
function SidebarMoreMenuPanel({
  userId,
  openPricing,
  onClose,
}: {
  userId: string | null;
  openPricing: (focus: PricingModalFocus) => void;
  onClose: () => void;
}) {
  const signOut = async () => {
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    onClose();
  };

  return (
    <div
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-2 shadow-lg min-w-[220px]"
      role="menu"
    >
      <div className="px-3 pb-2 border-b border-[var(--border-default)] mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          테마
        </p>
        <AppleThemeToggle className="w-full max-w-none" />
      </div>
      <button
        type="button"
        role="menuitem"
        className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all duration-150"
        onClick={() => {
          openPricing("overview");
          onClose();
        }}
      >
        요금제·이용 한도
      </button>
      <button
        type="button"
        role="menuitem"
        className="w-full text-left px-3 py-2.5 text-[13px] text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all duration-150"
        onClick={() => {
          openPricing("api");
          onClose();
        }}
      >
        외부 API·비용 안내
      </button>
      {userId ? (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] transition-all duration-150"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          로그아웃
        </button>
      ) : (
        <Link
          href="/login?next=/chat"
          className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-[var(--brand-trust-blue)] hover:bg-[var(--brand-trust-blue-soft)] transition-all duration-150"
          role="menuitem"
          onClick={() => onClose()}
        >
          로그인
        </Link>
      )}
    </div>
  );
}

/** 접힌 사이드바(72px): 더보기만 — 메뉴는 우측으로 */
function SidebarCollapsedRail({
  userId,
  openPricing,
  menuOpen,
  setMenuOpen,
  menuRef,
}: {
  userId: string | null;
  openPricing: (focus: PricingModalFocus) => void;
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={menuRef} className="relative flex w-full flex-col items-center pt-2">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all duration-150"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="더보기 메뉴"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute left-full bottom-0 z-[60] ml-2">
          <SidebarMoreMenuPanel
            userId={userId}
            openPricing={openPricing}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

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

function SidebarUserBar({
  menuRef,
  user,
  isAuthLoading,
  openPricing,
  menuOpen,
  setMenuOpen,
  onDrawerClose,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  user: User | null | undefined;
  isAuthLoading: boolean;
  openPricing: (focus: PricingModalFocus) => void;
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  onDrawerClose?: () => void;
}) {
  const label = sidebarDisplayName(user, isAuthLoading);
  const initials = sidebarUserInitials(user, isAuthLoading);
  const userId = user?.id ?? null;

  return (
    <div
      ref={menuRef}
      className="flex flex-shrink-0 items-center gap-1.5 border-t border-[var(--border-default)] px-3 py-3"
    >
      {isAuthLoading ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-0.5 pr-1 animate-pulse">
          <span className="flex h-9 w-9 shrink-0 rounded-full bg-[var(--bg-surface-subtle)]" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="block h-3 w-20 rounded bg-[var(--bg-surface-subtle)]" />
            <span className="block h-2.5 w-14 rounded bg-[var(--bg-surface-subtle)]" />
          </span>
        </div>
      ) : (
      <Link
        href={userId ? "/" : "/login?next=/chat"}
        onClick={() => onDrawerClose?.()}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 pl-0.5 pr-1 transition-all duration-150 hover:bg-[var(--bg-surface-subtle)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[11px] font-bold text-[var(--brand-trust-blue)] ring-1 ring-[var(--brand-trust-blue)]/18">
          {initials}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-semibold text-[var(--text-strong)]">
            {label}
          </span>
          <span className="block truncate text-[11px] text-[var(--text-muted)]">
            {userId ? "홈으로 이동" : "로그인하기"}
          </span>
        </span>
      </Link>
      )}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] ring-1 ring-[var(--border-default)]/80 transition-all duration-150 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="더보기"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div className="absolute bottom-full right-0 z-[60] mb-1 w-[min(240px,calc(100vw-2rem))]">
            <SidebarMoreMenuPanel
              userId={userId}
              openPricing={openPricing}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SidebarContent({
  conversations,
  savedPlans,
  activeConvId,
  onSelectConv,
  onNewChat,
  onDeleteConv,
  onSelectPlan,
  onOpenMap,
  onClose,
  isLoadingHistory,
  user,
  isAuthLoading,
  openPricing,
  sidebarMenuRef,
  sidebarMenuOpen,
  setSidebarMenuOpen,
}: {
  conversations: Conversation[];
  savedPlans: SavedPlan[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onNewChat: () => void;
  onDeleteConv: (id: string) => void;
  onSelectPlan: (sp: SavedPlan) => void;
  onOpenMap: (p: TravelPlan) => void;
  onClose?: () => void;
  isLoadingHistory: boolean;
  user: User | null | undefined;
  isAuthLoading: boolean;
  openPricing: (focus: PricingModalFocus) => void;
  sidebarMenuRef: React.RefObject<HTMLDivElement | null>;
  sidebarMenuOpen: boolean;
  setSidebarMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [plansListExpanded, setPlansListExpanded] = useState(false);
  const [convSearchOpen, setConvSearchOpen] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const q = convSearchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, convSearchQuery]);

  const grouped = groupByDate(filteredConversations);
  const showConvSearch = conversations.length >= 5;
  const plansToShow =
    savedPlans.length <= 3 || plansListExpanded ? savedPlans : savedPlans.slice(0, 3);

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {/* ① 상단 헤더 */}
      <div className="flex flex-shrink-0 items-center justify-between px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] shadow-sm"
            style={{ backgroundColor: BRAND.logo.background }}
          >
            <Compass
              className="h-4 w-4 shrink-0"
              style={{ color: BRAND.logo.electricBlue }}
              strokeWidth={2.4}
              aria-hidden
            />
          </div>
          <span className="truncate text-[14px] font-bold tracking-tight text-[var(--text-strong)]">
            {BRAND.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose?.();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)]"
            title="새 대화 시작"
            aria-label="새 대화 시작"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] md:hidden"
              aria-label="사이드바 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ② 나의 플랜 */}
      <div className="flex-shrink-0 border-b border-[var(--border-default)] px-3 pb-3">
        <button
          type="button"
          onClick={() => setPlanExpanded((v) => !v)}
          className="mb-1 flex w-full items-center justify-between rounded-xl px-1 py-1.5 transition-all duration-150 hover:bg-[var(--bg-surface-subtle)]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[13px]" aria-hidden>
              📋
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              나의 플랜
            </span>
            {savedPlans.length > 0 ? (
              <span className="rounded-full bg-[var(--brand-trust-blue-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-trust-blue)]">
                {savedPlans.length}
              </span>
            ) : null}
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
              planExpanded ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {planExpanded ? (
          <div className="space-y-1">
            {savedPlans.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-[var(--bg-surface-subtle)]/60 px-4 py-5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-soft)]">
                  <Navigation
                    className="h-5 w-5 text-[var(--brand-trust-blue)]"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </div>
                <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                  아직 만든 동선이 없어요
                </p>
                <p className="text-[11px] leading-snug text-[var(--text-muted)]">
                  아래에서 여행지를 선택하면 AI가 동선을 짜드려요
                </p>
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="mt-1 rounded-full bg-[var(--brand-primary)] px-4 py-2 text-[12px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] transition-colors touch-manipulation"
                >
                  동선 짜기 시작 →
                </button>
              </div>
            ) : (
              <>
                {plansToShow.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPlan(sp);
                        onClose?.();
                      }}
                      className="flex min-w-0 flex-1 flex-col rounded-xl px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--brand-trust-blue-soft)] hover:text-[var(--brand-trust-blue)]"
                    >
                      <span className="truncate font-medium text-[13px] text-[var(--text-strong)]">
                        {sp.title}
                      </span>
                      <span className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {new Date(sp.savedAt).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="mt-1 inline-flex w-fit rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-trust-blue)] ring-1 ring-[var(--border-default)]">
                        {sp.region}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMap(sp.plan)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all hover:bg-[var(--brand-trust-blue-soft)] hover:text-[var(--brand-trust-blue)]"
                      title="지도에서 보기"
                    >
                      <Map className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
                {savedPlans.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setPlansListExpanded((v) => !v)}
                    className="w-full rounded-xl py-2 text-center text-[12px] font-semibold text-[var(--brand-trust-blue)] transition-all duration-150 hover:bg-[var(--brand-trust-blue-soft)]/50"
                  >
                    {plansListExpanded ? "접기" : "더보기"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* ③ 대화 히스토리 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-2">
        {showConvSearch ? (
          <div className="mb-2 flex flex-shrink-0 items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => setConvSearchOpen((v) => !v)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
                convSearchOpen
                  ? "bg-[var(--brand-primary-soft)] text-[var(--brand-trust-blue)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-strong)]"
              }`}
              aria-expanded={convSearchOpen}
              aria-label="대화 검색"
              title="대화 검색"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            {convSearchOpen ? (
              <input
                type="search"
                value={convSearchQuery}
                onChange={(e) => setConvSearchQuery(e.target.value)}
                placeholder="대화 제목 검색"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[12px] text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand-trust-blue)]/25"
                autoFocus
              />
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center gap-2 px-3 py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand-trust-blue)]" />
              <span className="text-[11px] text-[var(--text-muted)]">대화 기록 불러오는 중…</span>
            </div>
          ) : grouped.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
              {convSearchQuery.trim() ? "검색 결과가 없어요" : "대화 기록이 없어요"}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.items.map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredConv(conv.id)}
                    onMouseLeave={() => setHoveredConv(null)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectConv(conv.id);
                        onClose?.();
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-[13px] transition-all duration-150 ${
                        activeConvId === conv.id
                          ? "bg-[var(--brand-primary-soft)] font-medium text-[var(--text-strong)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="block truncate pr-6">{conv.title}</span>
                    </button>
                    {hoveredConv === conv.id ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConv(conv.id);
                        }}
                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ④ 하단 유저 */}
      <SidebarUserBar
        menuRef={sidebarMenuRef}
        user={user}
        isAuthLoading={isAuthLoading}
        openPricing={openPricing}
        menuOpen={sidebarMenuOpen}
        setMenuOpen={setSidebarMenuOpen}
        onDrawerClose={onClose}
      />
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
  const v5TabletSplitLayout = useV5TabletSplitLayout();
  const [hybridSheetHostEl, setHybridSheetHostEl] = useState<HTMLDivElement | null>(null);
  const [hybridDraft, setHybridDraft] = useState(HYBRID_TRIP_EMPTY);
  const [mobileFreeInput, setMobileFreeInput] = useState(false);
  /** 입력 독(하이브리드·자유입력) 접기/펼치기 — 모바일·태블릿·데스크톱 공통 */
  const [composerDockExpanded, setComposerDockExpanded] = useState(true);
  const [mobilePlanFullscreenOpen, setMobilePlanFullscreenOpen] = useState(false);
  const [composerDesktopMode, setComposerDesktopMode] = useState<"picker" | "free">("picker");
  const [freeInputValidationToast, setFreeInputValidationToast] = useState<string | null>(null);

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

  /** 태블릿(md~1368px): 최초 진입 시 좌측 대화·로고 패널 접힘(아이콘 레일만). 넓은 데스크톱(1369px+)은 펼침 유지. */
  useLayoutEffect(() => {
    if (sidebarTabletInitRef.current) return;
    sidebarTabletInitRef.current = true;
    if (typeof window === "undefined") return;
    const tabletChat = window.matchMedia("(min-width: 768px) and (max-width: 1368px)");
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

      // 자유 입력 첫 메시지: 지역·일정 최소 검증 (칩에서 온 경우엔 이미 검증됨)
      const isFromFreeInput = text === undefined;
      const priorHasUser = (conversations.find((c) => c.id === activeConvId)?.messages ?? []).some((m) => m.role === "user");
      if (isFromFreeInput && !priorHasUser) {
        const check = evaluateTravelPromptChecklist(content);
        if (!check.region || !check.schedule) {
          const missing: string[] = [];
          if (!check.region) missing.push("여행지(지역)");
          if (!check.schedule) missing.push("일정(기간)");
          setFreeInputValidationToast(`${missing.join("·")}을 포함해 주세요`);
          setTimeout(() => setFreeInputValidationToast(null), 3000);
          return;
        }
      }

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
            "지역과 일정(기간)이 함께 있어야 AI 조회로 조건을 정리할 수 있어요. 하단 **8가지 칩**에서 지역·일정을 고른 뒤 「선택 조건 보내기」를 쓰거나, 채팅으로 구체적으로 적어 주세요. 칩 값이 실제 조건이 되면 「이 정보로 동선 짜기」로 확정할 수 있어요. (로컬 동선만 — 출발·귀경지는 사용하지 않아요.)",
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
        ok?: boolean;
        content?: string;
        error?: string;
        preferenceChips?: PreferenceChip[] | null;
        readyToGenerateRoute?: boolean;
        travelPlan?: TravelPlan | null;
      };

      let data: ReturnType<typeof normalizeV5ChatJson>;
      try {
        const res = await fetch("/api/v5/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });
        const parsed = (await res.json()) as ApiV5;
        data = normalizeV5ChatJson(res, parsed);
      } catch {
        data = {
          content:
            "네트워크 오류로 응답을 받지 못했어요. 연결을 확인한 뒤 다시 보내 주세요.",
          preferenceChips: null,
          readyToGenerateRoute: false,
          travelPlan: null,
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
    void handleSend(text);
  }, [hybridDraft, handleSend]);

  const handleConfirmRoute = useCallback(
    async (chipSourceMessageId: string, slots: PreferenceChip[]) => {
      const slotsFiltered = slots.filter((s) => !isDeparturePreferenceChip(s));
      if (!slotsFiltered.length || isTyping || routeGeneratingMessageId || !activeConvId) return;
      const slotsForPlan = enrichConfirmSlotsWithHybrid(slotsFiltered, hybridDraft);
      if (!routeChipCoreSlotsActionable(slotsForPlan)) return;

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

      const convForPlan = conversations.find((c) => c.id === activeConvId);
      const baseMsgs = convForPlan?.messages ?? [];
      const planRequestMessages = messagesToApiPayload([...baseMsgs, userMsg]).slice(-24);

      type ApiV5 = {
        ok?: boolean;
        content?: string;
        error?: string;
        travelPlan?: TravelPlan | null;
      };

      let data: {
        content?: string;
        preferenceChips?: PreferenceChip[] | null;
        readyToGenerateRoute?: boolean;
        travelPlan?: TravelPlan | null;
      };
      try {
        const res = await fetch("/api/v5/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: planRequestMessages,
            confirmRoute: { slots: slotsForPlan },
          }),
        });
        const parsed = (await res.json()) as ApiV5;
        data = normalizeV5ChatJson(res, parsed);
      } catch {
        data = {
          content:
            "네트워크 오류로 동선을 받지 못했어요. 연결을 확인한 뒤 다시 「이 정보로 동선 짜기」를 눌러 주세요.",
          travelPlan: null,
        };
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
    [
      activeConvId,
      conversations,
      hybridDraft,
      isTyping,
      routeGeneratingMessageId,
      userId,
      persistAssistantMessage,
    ]
  );

  // ── handleNewChat ─────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setHybridDraft({ ...HYBRID_TRIP_EMPTY });
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
            <div className="flex flex-col items-center py-4 gap-3 min-h-0 flex-1">
              <button onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all"
                title="사이드바 열기"><PanelLeft className="w-4 h-4" /></button>
              <button onClick={handleNewChat}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--text-strong)] transition-all"
                title="새 대화"><Plus className="w-4 h-4" /></button>
              <SidebarCollapsedRail
                userId={userId}
                openPricing={openPricing}
                menuOpen={chatHeaderMenuOpen}
                setMenuOpen={setChatHeaderMenuOpen}
                menuRef={chatHeaderMenuRef}
              />
            </div>
          ) : (
            <SidebarContent
              {...sidebarProps}
              onClose={undefined}
              user={user}
              isAuthLoading={isAuthLoading}
              openPricing={openPricing}
              sidebarMenuRef={chatHeaderMenuRef}
              sidebarMenuOpen={chatHeaderMenuOpen}
              setSidebarMenuOpen={setChatHeaderMenuOpen}
            />
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
              <SidebarContent
                {...sidebarProps}
                onClose={() => setMobileSidebarOpen(false)}
                user={user}
                isAuthLoading={isAuthLoading}
                openPricing={openPricing}
                sidebarMenuRef={chatHeaderMenuRef}
                sidebarMenuOpen={chatHeaderMenuOpen}
                setSidebarMenuOpen={setChatHeaderMenuOpen}
              />
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
            <div className="flex items-center gap-2 relative">
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
                  onOpenPricing={() => openPricing("overview")}
                  onScrollToComposer={() => {
                    setComposerDockExpanded(true);
                    composerShellRef.current?.scrollIntoView({
                      block: "end",
                      behavior: "smooth",
                    });
                  }}
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
                      isGuest={!userId}
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
                  className="v5-composer-liquid-panel flex w-full flex-col gap-2.5 rounded-2xl px-3.5 py-3 text-left touch-manipulation active:scale-[0.99] transition-transform"
                  aria-expanded={false}
                >
                  <span className="flex w-full min-w-0 items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)]">
                        <ChevronUp className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--text-strong)] leading-tight">
                          여행 조건 입력
                        </span>
                        <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                          {composerBusy
                            ? "응답 대기 중에도 아래에서 고른 조건을 확인할 수 있어요"
                            : "탭하면 칩·키보드 입력을 펼칩니다"}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-[var(--brand-trust-blue)] pt-0.5">
                      펼치기
                    </span>
                  </span>
                  <div className="flex w-full flex-wrap gap-1.5 pl-[2.75rem] pr-0.5 max-h-[5.25rem] overflow-y-auto overscroll-contain">
                    {SLOT_META.map(({ key, short }) => {
                      const raw = hybridDraft[key].trim();
                      if (!raw) return null;
                      const display = HYBRID_MULTI_KEYS.has(key)
                        ? parseHybridMultiValues(raw).join(", ")
                        : raw;
                      const compact =
                        display.length > 36 ? `${display.slice(0, 34)}…` : display;
                      return (
                        <span
                          key={key}
                          className="inline-flex max-w-full min-w-0 items-center rounded-[10px] bg-[color-mix(in_srgb,var(--brand-trust-blue)_12%,var(--bg-elevated))] px-2 py-1 text-[10px] font-semibold text-[var(--brand-trust-blue)] ring-1 ring-[var(--brand-trust-blue)]/18"
                        >
                          <span className="shrink-0 opacity-80">{short}</span>
                          <span className="mx-1 opacity-35" aria-hidden>
                            ·
                          </span>
                          <span className="min-w-0 truncate">{compact}</span>
                        </span>
                      );
                    })}
                  </div>
                </button>
              )}

              {composerDockExpanded && (
                <>
              <div className="hidden lg:flex w-full items-center justify-between gap-3 px-0.5">
                <div
                  className={cn(
                    "relative inline-flex h-[30px] w-[12.5rem] shrink-0 rounded-full p-[3px]",
                    "bg-black/[0.06] ring-1 ring-inset ring-black/[0.06]",
                    "dark:bg-white/[0.1] dark:ring-white/[0.08]",
                  )}
                  role="tablist"
                  aria-label="입력 전환"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-[3px] top-[3px] bottom-[3px] w-[calc(50%-4.5px)] rounded-full",
                      "bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)]",
                      "ring-1 ring-black/[0.04]",
                      "dark:bg-zinc-600 dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] dark:ring-white/[0.12]",
                      "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      composerDesktopMode === "free"
                        ? "translate-x-[calc(100%+3px)]"
                        : "translate-x-0",
                    )}
                  />
                  <div className="relative z-10 grid h-full w-full grid-cols-2">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerDesktopMode === "picker"}
                      onClick={() => setDesktopComposerMode("picker")}
                      className={cn(
                        "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150",
                        composerDesktopMode === "picker"
                          ? "text-[var(--text-strong)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      간편 선택
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerDesktopMode === "free"}
                      onClick={() => setDesktopComposerMode("free")}
                      className={cn(
                        "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150",
                        composerDesktopMode === "free"
                          ? "text-[var(--text-strong)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      자유 입력
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerDockExpanded(false)}
                  className={cn(
                    "inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full px-3.5",
                    "bg-black/[0.06] ring-1 ring-inset ring-black/[0.06]",
                    "dark:bg-white/[0.1] dark:ring-white/[0.08]",
                    "text-[11px] font-semibold transition-colors duration-150",
                    "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                  )}
                  aria-expanded={composerDockExpanded}
                  title="입력 영역 접기"
                >
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  접기
                </button>
              </div>

              <div className="flex lg:hidden w-full items-center justify-between gap-2 px-0.5">
                <div
                  className={cn(
                    "relative inline-flex h-[30px] w-[12.5rem] shrink-0 rounded-full p-[3px]",
                    "bg-black/[0.06] ring-1 ring-inset ring-black/[0.06]",
                    "dark:bg-white/[0.1] dark:ring-white/[0.08]",
                  )}
                  role="tablist"
                  aria-label="입력 전환"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-[3px] top-[3px] bottom-[3px] w-[calc(50%-4.5px)] rounded-full",
                      "bg-[var(--bg-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)]",
                      "ring-1 ring-black/[0.04]",
                      "dark:bg-zinc-600 dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] dark:ring-white/[0.12]",
                      "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      mobileFreeInput ? "translate-x-[calc(100%+3px)]" : "translate-x-0",
                    )}
                  />
                  <div className="relative z-10 grid h-full w-full grid-cols-2">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!mobileFreeInput}
                      onClick={() => setMobileFreeInput(false)}
                      className={cn(
                        "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150 touch-manipulation",
                        !mobileFreeInput
                          ? "text-[var(--text-strong)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      간편 선택
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mobileFreeInput}
                      onClick={() => setMobileFreeInput(true)}
                      className={cn(
                        "rounded-full text-[11px] font-semibold tracking-tight transition-colors duration-150 touch-manipulation",
                        mobileFreeInput
                          ? "text-[var(--text-strong)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      자유 입력
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerDockExpanded(false)}
                  className={cn(
                    "inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full px-3",
                    "bg-black/[0.06] ring-1 ring-inset ring-black/[0.06]",
                    "dark:bg-white/[0.1] dark:ring-white/[0.08]",
                    "text-[11px] font-semibold transition-colors duration-150 touch-manipulation",
                    "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                  )}
                  aria-expanded={composerDockExpanded}
                  title="입력 영역 접기"
                >
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  접기
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
                  sheetPortalElement={hybridSheetHostEl}
                  dockSheetInTabletSplit={v5TabletSplitLayout && showHybridComposer}
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
            hybridSheetHostCallback={setHybridSheetHostEl}
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

      {/* 자유 입력 validation 토스트 */}
      {freeInputValidationToast && (
        <div
          className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--error)] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg"
          role="alert"
        >
          📍 {freeInputValidationToast}
        </div>
      )}
    </>
  );
}
