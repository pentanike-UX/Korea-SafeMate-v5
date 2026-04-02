"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, MapPin, Clock, CloudSun, Bookmark, BookmarkCheck,
  Send, Utensils, Coffee, Train, Camera, ChevronRight,
  Sparkles, MoreHorizontal, Trash2, PanelLeftClose, PanelLeft,
  Navigation, Hotel, Menu, X, Map,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  loadConversations, createConversation, updateConversationTitle,
  deleteConversation as dbDeleteConversation, loadMessages, saveMessage,
  loadSavedPlans, savePlanToDB,
  type DBConversation, type DBMessage, type DBSavedPlan,
} from "@/lib/v5/chat-persistence";
import { V5PlanMapModal } from "./v5-plan-map-modal";

// ─── Domain Types ──────────────────────────────────────────────────────────────

type SpotType = "attraction" | "food" | "cafe" | "transport" | "hotel";

interface TravelSpot {
  id: string; name: string; type: SpotType; duration: string;
  note?: string; transitToNext?: string; lat?: number; lng?: number;
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
    "안녕하세요! 한국 여행 동선을 함께 짤게요. 지역·일정·인원·교통·분위기·음식 취향 등을 말씀해 주시면 칩으로 정리해 드리고, 확인하신 뒤 「이 정보로 동선 짜기」를 누르면 스팟 순서·이동·소요 시간·대안까지 담은 코스를 만들어요. 아래 예시를 눌러 시작해 보세요.",
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
    attraction: "bg-blue-50 text-blue-600",
    food: "bg-orange-50 text-orange-500",
    cafe: "bg-amber-50 text-amber-600",
    transport: "bg-slate-100 text-slate-500",
    hotel: "bg-purple-50 text-purple-600",
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
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden shadow-[0_2px_12px_rgba(20,20,20,0.06)]">
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
        {plan.spots.map((spot, idx) => (
          <div key={spot.id}>
            <div className="flex items-start gap-3 py-2">
              <div className="relative flex-shrink-0">
                <SpotIcon type={spot.type} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--text-strong)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
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
        ))}
      </div>
      <div className="px-4 pb-3 space-y-2">
        {plan.weatherNote && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)]">
            <CloudSun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-[12px] text-[var(--text-secondary)]">{plan.weatherNote}</p>
          </div>
        )}
        {plan.alternativeNote && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-[12px] text-amber-700">{plan.alternativeNote}</p>
          </div>
        )}
        {plan.totalTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[11px] text-[var(--text-muted)]">총 이동시간 약 {plan.totalTime}</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => !isSaved && onSave(plan)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${
            isSaved
              ? "bg-[var(--success-soft)] text-[var(--success)] cursor-default"
              : "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.98]"
          }`}
        >
          {isSaved ? <><BookmarkCheck className="w-4 h-4" />저장됨</> : <><Bookmark className="w-4 h-4" />추천한 동선 저장</>}
        </button>
        {isSaved && (
          <button
            onClick={() => onViewMap(plan)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-semibold bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] hover:bg-blue-100 active:scale-[0.98] transition-all duration-200"
          >
            <Map className="w-4 h-4" />지도
          </button>
        )}
      </div>
    </div>
  );
}

function PreferenceChipsCard({
  chips,
  readyToGenerateRoute,
  onRemoveChip,
  onConfirm,
  isGenerating,
}: {
  chips: PreferenceChip[];
  readyToGenerateRoute: boolean;
  onRemoveChip: (chipId: string) => void;
  onConfirm: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="mt-3 w-full max-w-[480px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[0_2px_12px_rgba(20,20,20,0.06)]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--brand-trust-blue)]" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">정리한 여행 조건</span>
        {readyToGenerateRoute && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">동선 생성 가능</span>
        )}
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">
        내용을 확인하고 필요 없는 칩은 뺀 뒤, 동선을 만들어 달라고 눌러 주세요.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.length === 0 ? (
          <span className="text-[12px] text-[var(--text-muted)]">남은 칩이 없어요. 다시 대화로 알려 주세요.</span>
        ) : (
          chips.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-full text-[12px] font-medium bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] border border-blue-100"
            >
              <span className="text-[10px] opacity-80">{c.label}</span>
              <span className="text-[var(--text-strong)]">{c.value}</span>
              <button
                type="button"
                onClick={() => onRemoveChip(c.id)}
                className="ml-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-white/80 hover:text-[var(--error)] transition-colors"
                aria-label={`${c.label} 칩 제거`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={chips.length === 0 || isGenerating}
        className={`w-full py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${
          chips.length > 0 && !isGenerating
            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.98]"
            : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
        }`}
      >
        {isGenerating ? "동선 짜는 중…" : "이 정보로 동선 짜기"}
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  savedPlanIds,
  onSavePlan,
  onViewMap,
  onRemovePreferenceChip,
  onConfirmRoute,
  routeGeneratingMessageId,
}: {
  message: Message;
  savedPlanIds: Set<string>;
  onSavePlan: (p: TravelPlan) => void;
  onViewMap: (p: TravelPlan) => void;
  onRemovePreferenceChip?: (messageId: string, chipId: string) => void;
  onConfirmRoute?: (messageId: string, slots: PreferenceChip[]) => void;
  routeGeneratingMessageId: string | null;
}) {
  const isUser = message.role === "user";
  const chips = message.preferenceChips ?? [];
  const showChips = !isUser && chips.length > 0 && onRemovePreferenceChip && onConfirmRoute;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-trust-blue)] to-blue-400 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
          isUser
            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] rounded-br-sm"
            : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-bl-sm shadow-[0_1px_6px_rgba(20,20,20,0.05)]"
        }`}>
          {message.content}
        </div>
        {showChips && (
          <PreferenceChipsCard
            chips={chips}
            readyToGenerateRoute={Boolean(message.canGenerateRoute)}
            onRemoveChip={(chipId) => onRemovePreferenceChip(message.id, chipId)}
            onConfirm={() => onConfirmRoute(message.id, chips)}
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

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-end">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-trust-blue)] to-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const SUGGESTION_CHIPS = [
  "경주 2박 3일 혼자 여행", "부산 당일치기 맛집 중심",
  "제주 4박 5일 렌터카 여행", "서울 K-콘텐츠 스팟 투어",
  "전주 한옥마을 1박 2일", "강릉 바다 드라이브 코스",
];

function EmptyState({ onSuggestion }: { onSuggestion: (t: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32 select-none">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-trust-blue)] to-blue-400 flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(47,79,143,0.25)]">
        <MapPin className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-[22px] font-bold text-[var(--text-strong)] text-center mb-2">어디로 여행을 떠나시나요?</h1>
      <p className="text-[14px] text-[var(--text-secondary)] text-center max-w-xs leading-relaxed mb-8">
        지역, 기간, 여행 스타일을 알려주시면<br />최적의 동선과 스팟을 제안해 드려요.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {SUGGESTION_CHIPS.map((chip) => (
          <button key={chip} onClick={() => onSuggestion(chip)}
            className="px-3.5 py-2 rounded-full text-[13px] font-medium bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand-trust-blue)] hover:text-[var(--brand-trust-blue)] hover:bg-[var(--brand-trust-blue-soft)] transition-all duration-150 active:scale-95">
            {chip}
          </button>
        ))}
      </div>
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
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[var(--brand-trust-blue)] to-blue-400 flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-bold text-[var(--text-strong)] tracking-tight">SafeMate</span>
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mapModalPlan, setMapModalPlan] = useState<TravelPlan | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 마지막으로 데이터를 로드한 userId (재로드 방지)
  const loadedForUserRef = useRef<string | null>(undefined as unknown as null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

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

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, isTyping, routeGeneratingMessageId]);

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

  const handleRemovePreferenceChip = useCallback(
    (messageId: string, chipId: string) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId || !m.preferenceChips?.length) return m;
              const preferenceChips = m.preferenceChips.filter((ch) => ch.id !== chipId);
              return {
                ...m,
                preferenceChips: preferenceChips.length ? preferenceChips : undefined,
                canGenerateRoute: preferenceChips.length ? m.canGenerateRoute : false,
              };
            }),
          };
        })
      );
    },
    [activeConvId]
  );

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
        prev.map((c) => (c.id !== activeConvId ? c : { ...c, messages: [...c.messages, aiMsg] }))
      );
      setIsTyping(false);

      persistAssistantMessage(aiMsg, activeConvId);
    },
    [
      inputValue,
      isTyping,
      routeGeneratingMessageId,
      activeConvId,
      userId,
      conversations,
      persistAssistantMessage,
    ]
  );

  const handleConfirmRoute = useCallback(
    async (chipSourceMessageId: string, slots: PreferenceChip[]) => {
      if (!slots.length || isTyping || routeGeneratingMessageId || !activeConvId) return;

      const priorMsgs = conversations.find((c) => c.id === activeConvId)?.messages ?? [];
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

      const apiMessages = messagesToApiPayload([...priorMsgs, userMsg]);

      type ApiV5 = {
        content?: string;
        travelPlan?: TravelPlan | null;
      };

      let data: ApiV5;
      try {
        const res = await fetch("/api/v5/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, confirmRoute: { slots } }),
        });
        if (!res.ok) throw new Error(`chat ${res.status}`);
        data = (await res.json()) as ApiV5;
      } catch {
        const synthetic = slots.map((s) => s.value).join(" ");
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
    [
      activeConvId,
      conversations,
      isTyping,
      routeGeneratingMessageId,
      userId,
      persistAssistantMessage,
    ]
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

  const sidebarProps = {
    conversations, savedPlans, activeConvId,
    onSelectConv: setActiveConvId, onNewChat: handleNewChat,
    onDeleteConv: handleDeleteConv, onSelectPlan: handleSelectPlan,
    onOpenMap: setMapModalPlan, isLoadingHistory,
  };

  return (
    <>
      <div className="flex h-[100dvh] w-screen overflow-hidden bg-[var(--bg-page)]">
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

        {/* ── Main Chat ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
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
                {hasUserMessage ? activeConv?.title : "여행 동선 AI"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* 로그인 상태 뱃지 */}
              {!isAuthLoading && (
                <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  userId
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
                }`}>
                  {userId ? "동기화 중" : "게스트"}
                </span>
              )}
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)] transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {/* 메시지 로드 중 (대화 전환 후 DB 로드 전) */}
            {activeConv && !activeConv.messagesLoaded && userId ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand-trust-blue)] animate-spin" />
                  <span className="text-[12px] text-[var(--text-muted)]">메시지 불러오는 중…</span>
                </div>
              </div>
            ) : !hasUserMessage ? (
              <EmptyState onSuggestion={(t) => void handleSend(t)} />
            ) : (
              <div className="max-w-[720px] mx-auto px-4 md:px-5 py-6 space-y-5">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    savedPlanIds={savedPlanIds}
                    onSavePlan={handleSavePlan}
                    onViewMap={setMapModalPlan}
                    onRemovePreferenceChip={handleRemovePreferenceChip}
                    onConfirmRoute={handleConfirmRoute}
                    routeGeneratingMessageId={routeGeneratingMessageId}
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex-shrink-0 px-4 pb-5 pt-3 bg-[var(--bg-page)]">
            <div className="max-w-[720px] mx-auto">
              <div className="flex items-end gap-2 px-4 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[0_4px_20px_rgba(20,20,20,0.07)] focus-within:border-[var(--brand-trust-blue)] focus-within:shadow-[0_4px_20px_rgba(47,79,143,0.12)] transition-all duration-200">
                <textarea ref={textareaRef} value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="지역·일정·인원·교통·분위기·음식 취향을 알려주세요 (예: 경주 2박 3일 맛집·도보 위주)"
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed py-0.5" />
                <button onClick={() => void handleSend()}
                  disabled={!inputValue.trim() || isTyping || Boolean(routeGeneratingMessageId)}
                  className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 ${
                    inputValue.trim() && !isTyping && !routeGeneratingMessageId
                      ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-95 shadow-sm"
                      : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
                  }`}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-center text-[11px] text-[var(--text-muted)] mt-2 hidden md:block">
                Enter로 전송 · Shift+Enter 줄바꿈
              </p>
            </div>
          </div>
        </div>
      </div>

      {mapModalPlan && (
        <V5PlanMapModal plan={mapModalPlan} onClose={() => setMapModalPlan(null)} />
      )}
    </>
  );
}
