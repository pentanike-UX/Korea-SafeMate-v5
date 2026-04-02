"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  MapPin,
  Navigation,
  Flag,
  CalendarDays,
  Users,
  Train,
  Sparkles,
  Utensils,
  X,
  ChevronRight,
  Send,
} from "lucide-react";

export type HybridTripKey =
  | "region"
  | "origin"
  | "destination"
  | "schedule"
  | "people"
  | "transport"
  | "vibe"
  | "food";

export const HYBRID_TRIP_EMPTY: Record<HybridTripKey, string> = {
  region: "",
  origin: "",
  destination: "",
  schedule: "",
  people: "",
  transport: "",
  vibe: "",
  food: "",
};

const SLOT_META: {
  key: HybridTripKey;
  label: string;
  short: string;
  icon: typeof MapPin;
}[] = [
  { key: "region", label: "지역", short: "어디로", icon: MapPin },
  { key: "origin", label: "출발지", short: "출발", icon: Navigation },
  { key: "destination", label: "도착지", short: "도착", icon: Flag },
  { key: "schedule", label: "일정", short: "일정", icon: CalendarDays },
  { key: "people", label: "인원", short: "인원", icon: Users },
  { key: "transport", label: "교통", short: "교통", icon: Train },
  { key: "vibe", label: "분위기", short: "분위기", icon: Sparkles },
  { key: "food", label: "음식", short: "음식", icon: Utensils },
];

export const HYBRID_SLOT_OPTIONS: Record<HybridTripKey, string[]> = {
  region: [
    "제주",
    "부산·해운대",
    "경주",
    "서울",
    "강릉",
    "여수",
    "전주",
    "속초",
    "춘천",
    "대구",
    "인천",
    "광주",
    "대전",
    "울산",
    "통영",
    "안동",
  ],
  origin: [
    "서울역",
    "강남·신논현",
    "용산역",
    "인천공항",
    "김포공항",
    "부산역",
    "대전역",
    "수원역",
    "집 근처에서 출발",
    "회사 근처에서 출발",
  ],
  destination: [
    "시내·숙소 근처",
    "공항·항구 도착",
    "역 앞에서 시작",
    "관광지 중심",
    "해변·바다 근처",
    "한옥마을",
    "다운타운·번화가",
  ],
  schedule: [
    "당일 치기",
    "1박 2일",
    "2박 3일",
    "3박 4일",
    "주말만",
    "연휴 활용",
    "일주일 안팎",
  ],
  people: ["혼자", "2명·커플", "3~4명", "가족(아이 동반)", "5명 이상·단체"],
  transport: [
    "KTX·SRT",
    "렌터카",
    "자가용",
    "대중교통 위주",
    "택시·앱",
    "도보 위주",
    "국내선 비행",
  ],
  vibe: [
    "한적·힐링",
    "맛집·카페",
    "역사·유적",
    "사진·인생샷",
    "액티브",
    "가성비",
    "럭셔리",
    "로컬 체험",
  ],
  food: [
    "한식 위주",
    "해산물·회",
    "맛집 투어",
    "카페 많이",
    "술·야식",
    "브런치",
    "비건·채식 OK",
    "아이 메뉴",
  ],
};

/** 자연어 한 줄로 조합 → 기존 handleSend / gather 파이프라인에 그대로 전달 */
export function buildHybridPrompt(d: Record<HybridTripKey, string>): string {
  const parts: string[] = [];
  const r = d.region.trim();
  const o = d.origin.trim();
  const dest = d.destination.trim();
  const sc = d.schedule.trim();
  const pe = d.people.trim();
  const tr = d.transport.trim();
  const vi = d.vibe.trim();
  const fo = d.food.trim();
  if (r) parts.push(`여행 지역은 ${r}`);
  if (o) parts.push(`출발·귀경은 ${o}`);
  if (dest) parts.push(`도착 후 머무는 중심은 ${dest}`);
  if (sc) parts.push(`일정은 ${sc}`);
  if (pe) parts.push(`인원은 ${pe}`);
  if (tr) parts.push(`이동은 ${tr} 위주`);
  if (vi) parts.push(`분위기는 ${vi}`);
  if (fo) parts.push(`음식·취향은 ${fo}`);
  if (parts.length === 0) return "";
  return `${parts.join(". ")}. 왕복 동선으로 짜 줘.`;
}

export function hybridHasMinimumForSend(d: Record<HybridTripKey, string>): boolean {
  return Boolean(d.region.trim() && d.schedule.trim());
}

/** Tailwind `lg`와 동일 1024px — useEffect보다 빨리 맞춰 깜빡임·모드 오판을 줄임 */
export function useLgUp(): boolean {
  const [lg, setLg] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return lg;
}

export function HybridTripComposer({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
  showSendButton = true,
}: {
  draft: Record<HybridTripKey, string>;
  onDraftChange: (next: Record<HybridTripKey, string>) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** 데스크톱에서 상단 바에 보내기가 있으면 false */
  showSendButton?: boolean;
}) {
  const [openKey, setOpenKey] = useState<HybridTripKey | null>(null);
  const [customLine, setCustomLine] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const activeMeta = useMemo(
    () => SLOT_META.find((s) => s.key === openKey) ?? null,
    [openKey],
  );

  const openSheet = useCallback((key: HybridTripKey) => {
    setOpenKey(key);
    setCustomLine(draft[key] ?? "");
    if (key === "schedule") {
      setRangeStart("");
      setRangeEnd("");
    }
  }, [draft]);

  const applyValue = useCallback(
    (value: string) => {
      if (!openKey) return;
      onDraftChange({ ...draft, [openKey]: value.trim() });
      setOpenKey(null);
      setCustomLine("");
    },
    [openKey, draft, onDraftChange],
  );

  const canSend = hybridHasMinimumForSend(draft) && !disabled;

  return (
    <div className="v5-composer-liquid-panel space-y-3 rounded-2xl px-3 py-3 md:px-4 md:py-4">
      <p className="text-[12px] font-semibold text-[var(--text-strong)] tracking-tight px-0.5">
        하이브리드 입력 · 8가지 칩으로 조합
      </p>
      <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-tight px-0.5 -mt-1">
        탭하면 시트에서 고르거나 짧게 직접 입력 · 지역·일정 필수 후 보내기
      </p>
      <div className="v5-hybrid-chip-strip flex flex-wrap gap-2">
        {SLOT_META.map(({ key, label, short, icon: Icon }) => {
          const v = draft[key].trim();
          const filled = Boolean(v);
          return (
            <button
              key={key}
              type="button"
              onClick={() => openSheet(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 min-h-[44px] max-w-full transition-colors touch-manipulation ${
                filled
                  ? "border-[var(--brand-trust-blue)]/40 bg-[var(--brand-trust-blue-soft)] text-[var(--text-strong)]"
                  : "border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/80 text-[var(--text-muted)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="min-w-0 text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
                  {short}
                </span>
                <span className="block text-[12px] font-medium truncate max-w-[9.5rem] sm:max-w-[11rem]">
                  {v || `${label} 선택`}
                </span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            </button>
          );
        })}
      </div>

      {showSendButton && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold transition-all ${
            canSend
              ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] hover:bg-[var(--brand-primary-hover)] active:scale-[0.99]"
              : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] cursor-not-allowed"
          }`}
        >
          <Send className="h-4 w-4" />
          선택 조건 보내기
          <span className="text-[11px] font-normal opacity-80">(지역·일정 필수)</span>
        </button>
      )}

      {openKey && activeMeta && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
          style={{ background: "rgba(10,10,10,0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="v5-hybrid-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="닫기"
            onClick={() => setOpenKey(null)}
          />
          <div
            className={`relative z-[81] flex w-full max-w-lg flex-col bg-[var(--bg-elevated)] shadow-2xl border border-[var(--border-default)] max-h-[min(88dvh,560px)] sm:max-h-[min(70vh,520px)] sm:rounded-2xl rounded-t-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3 shrink-0">
              <h2 id="v5-hybrid-sheet-title" className="text-[15px] font-semibold text-[var(--text-strong)]">
                {activeMeta.label} 선택
              </h2>
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--brand-primary-soft)]"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="v5-hybrid-wheel flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5">
              {openKey === "schedule" && (
                <div className="mb-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]/50 px-3 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">캘린더로 기간 넣기(선택)</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-[12px] text-[var(--text-secondary)] shrink-0">시작</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1.5 text-base text-[var(--text-strong)]"
                    />
                    <label className="text-[12px] text-[var(--text-secondary)] shrink-0">종료</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1.5 text-base text-[var(--text-strong)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (rangeStart && rangeEnd) {
                          applyValue(`${rangeStart} ~ ${rangeEnd}`);
                        } else if (rangeStart) {
                          applyValue(`${rangeStart} 출발`);
                        }
                      }}
                      disabled={!rangeStart}
                      className="rounded-lg bg-[var(--brand-trust-blue-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--brand-trust-blue)] disabled:opacity-40"
                    >
                      날짜 반영
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    아래 프리셋(당일·N박)을 써도 됩니다.
                  </p>
                </div>
              )}
              {HYBRID_SLOT_OPTIONS[openKey].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => applyValue(opt)}
                  className="v5-hybrid-wheel-item w-full snap-start min-h-[48px] rounded-xl border border-transparent px-4 py-3 text-left text-[14px] font-medium text-[var(--text-strong)] hover:bg-[var(--brand-trust-blue-soft)] hover:border-[var(--brand-trust-blue)]/20 active:scale-[0.99] transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--border-default)] px-3 py-3 space-y-2 shrink-0 bg-[var(--bg-page)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-1">
                직접 입력
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLine}
                  onChange={(e) => setCustomLine(e.target.value)}
                  placeholder={`${activeMeta.label}을(를) 짧게 입력`}
                  className="flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-base text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => customLine.trim() && applyValue(customLine)}
                  disabled={!customLine.trim()}
                  className="shrink-0 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-on-brand)] disabled:opacity-40"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { SLOT_META };
