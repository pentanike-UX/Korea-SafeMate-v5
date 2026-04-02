"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";

type UsageApiPayload = {
  date: string;
  planTier: string;
  billing: {
    hasStripeCustomer: boolean;
    hasActiveSubscription: boolean;
    currentPeriodEnd: string | null;
  };
  usage: {
    geminiGenerations: number;
    geminiEstInputTokens: number;
    geminiEstOutputTokens: number;
    routingLiveCalls: number;
    naverLiveCalls: number;
  };
  limits: {
    geminiGenerationsPerDay: number;
    routingLivePerDay: number;
    naverLivePerDay: number;
  };
  percent: { gemini: number; routing: number; naver: number };
  stripeReady: boolean;
};

function UsageBar({
  label,
  used,
  cap,
  pct,
}: {
  label: string;
  used: number;
  cap: number;
  pct: number;
}) {
  const warn = pct >= 50;
  const danger = pct >= 85;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
        <span>{label}</span>
        <span className="font-mono text-[var(--text-secondary)]">
          {used} / {cap} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden border border-[var(--border-default)]">
        <div
          className={`h-full rounded-full transition-all ${
            danger ? "bg-red-500" : warn ? "bg-amber-500" : "bg-[var(--brand-trust-blue)]"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function UsageAndBillingSection({ isGuest }: { isGuest: boolean }) {
  const [data, setData] = useState<UsageApiPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setData(null);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    void fetch("/api/wayly/usage", { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          setErr("로그인 세션이 필요합니다.");
          setData(null);
          return null;
        }
        if (!r.ok) throw new Error("usage");
        return r.json() as Promise<UsageApiPayload>;
      })
      .then((j) => {
        if (j) setData(j);
      })
      .catch(() => setErr("사용량을 불러오지 못했습니다. DB 마이그레이션을 적용했는지 확인하세요."))
      .finally(() => setLoading(false));
  }, [isGuest]);

  const startCheckout = async () => {
    setBillingBusy(true);
    try {
      const r = await fetch("/api/wayly/billing/checkout", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.href = j.url;
      else window.alert(j.error ?? "결제를 시작할 수 없습니다.");
    } finally {
      setBillingBusy(false);
    }
  };

  const openPortal = async () => {
    setBillingBusy(true);
    try {
      const r = await fetch("/api/wayly/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.href = j.url;
      else window.alert(j.error ?? "결제 포털을 열 수 없습니다.");
    } finally {
      setBillingBusy(false);
    }
  };

  if (isGuest) {
    return (
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-3 py-3">
        <h3 className="text-[12px] font-bold text-[var(--text-strong)] mb-1">오늘 사용량 대시보드</h3>
        <p className="text-[12px] text-[var(--text-secondary)]">
          로그인하면 <strong className="text-[var(--text-strong)]">Gemini 호출·실경로 API(네이버/OSRM)</strong>{" "}
          사용 비율을 오늘 기준으로 확인할 수 있어요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold text-[var(--text-strong)]">오늘 사용량 (UTC 날짜 기준)</h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" aria-hidden />}
      </div>
      {err && <p className="text-[11px] text-red-600 dark:text-red-400">{err}</p>}
      {data && !err && (
        <>
          <p className="text-[11px] text-[var(--text-muted)]">
            플랜: <strong className="text-[var(--text-strong)]">{data.planTier}</strong>
            {data.billing.currentPeriodEnd && data.planTier === "plus" && (
              <>
                {" "}
                · 다음 갱신{" "}
                {new Date(data.billing.currentPeriodEnd).toLocaleString("ko-KR", {
                  dateStyle: "medium",
                })}
              </>
            )}
          </p>
          <UsageBar
            label="Gemini 생성(회)"
            used={data.usage.geminiGenerations}
            cap={data.limits.geminiGenerationsPerDay}
            pct={data.percent.gemini}
          />
          <UsageBar
            label="실경로 API 호출(캐시 제외)"
            used={data.usage.routingLiveCalls}
            cap={data.limits.routingLivePerDay}
            pct={data.percent.routing}
          />
          <UsageBar
            label="그중 네이버 길찾기(실호출)"
            used={data.usage.naverLiveCalls}
            cap={data.limits.naverLivePerDay}
            pct={data.percent.naver}
          />
          <p className="text-[10px] text-[var(--text-muted)] leading-snug">
            토큰 추정치(누적): 입력 약 {data.usage.geminiEstInputTokens.toLocaleString()} · 출력 약{" "}
            {data.usage.geminiEstOutputTokens.toLocaleString()} (참고용, 과금과 1:1 아님)
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {data.stripeReady ? (
              <>
                {data.planTier !== "plus" && (
                  <button
                    type="button"
                    disabled={billingBusy}
                    onClick={() => void startCheckout()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] text-[var(--text-on-brand)] text-[12px] font-semibold px-3 py-2 hover:opacity-95 disabled:opacity-50"
                  >
                    {billingBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Wayly+ 구독 (Stripe)
                  </button>
                )}
                {data.billing.hasStripeCustomer && (
                  <button
                    type="button"
                    disabled={billingBusy}
                    onClick={() => void openPortal()}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[12px] font-medium px-3 py-2 text-[var(--text-strong)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    결제·구독 관리
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)]">
                Stripe 환경 변수가 없어 결제 버튼이 숨겨졌습니다. (STRIPE_SECRET_KEY, STRIPE_PRICE_WAYLY_PLUS)
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export type PricingModalFocus = "overview" | "guest" | "api";

export function V5ChatPricingModal({
  open,
  onClose,
  focus = "overview",
  isGuest,
}: {
  open: boolean;
  onClose: () => void;
  focus?: PricingModalFocus;
  isGuest: boolean;
}) {
  const guestRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (focus === "guest") guestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focus === "api") apiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [open, focus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(10,10,10,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="relative flex w-full max-h-[min(92dvh,760px)] flex-col overflow-hidden rounded-t-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v5-pricing-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <h2 id="v5-pricing-title" className="text-[16px] font-bold text-[var(--text-strong)]">
            {BRAND.name} 요금제·이용 안내
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
          <p className="text-[12px] text-[var(--text-muted)] rounded-xl bg-[var(--bg-surface-subtle)] px-3 py-2 border border-[var(--border-default)]">
            아래 내용은 <strong className="text-[var(--text-strong)]">서비스·비용 정책 방향</strong>을 안내합니다.
            사용량 카드는 서버에 기록된 오늘(UTC) 기준 수치이며, Stripe 연동 시 Wayly+ 구독을 진행할 수 있습니다.
          </p>

          <UsageAndBillingSection isGuest={isGuest} />

          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--brand-trust-blue)] mb-2">
              플랜 개요
            </h3>
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden text-[12px]">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">플랜</th>
                    <th className="px-3 py-2 font-semibold">채팅·동선</th>
                    <th className="px-3 py-2 font-semibold">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-[var(--text-strong)]">Free</td>
                    <td className="px-3 py-2">기본 한도</td>
                    <td className="px-3 py-2">가입·로그인 후 동기화</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-[var(--text-strong)]">Wayly+</td>
                    <td className="px-3 py-2">확대 한도</td>
                    <td className="px-3 py-2">API 비용 분담·우선 처리(예정)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              구체적 월 요금·회수 제한은 출시 단계에 맞춰 공지합니다.
            </p>
          </section>

          <section ref={apiRef} className="scroll-mt-4">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--brand-trust-blue)] mb-2">
              외부 API·무료 구간
            </h3>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-[var(--text-strong)]">Google (Gemini 등)</strong>: 개발자 콘솔 기준
                무료 티어(일일 토큰·요청 한도)가 있으며, 초과 시 유료 과금이 발생할 수 있습니다.
              </li>
              <li>
                <strong className="text-[var(--text-strong)]">네이버 클라우드(지도 길찾기 등)</strong>: 상품별
                무료 쿼터와 초과 요금 정책이 별도로 적용됩니다.
              </li>
              <li>
                <strong className="text-[var(--text-strong)]">OSRM 등 공개 라우팅</strong>: 무료 인스턴스는
                속도·한도 제약이 있을 수 있어, 트래픽에 따라 유료 엔드포인트로 전환할 수 있습니다.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-3">
            <h3 className="text-[12px] font-bold text-amber-900 dark:text-amber-200 mb-1.5">
              50% 알림·유료 전환 원칙
            </h3>
            <p className="text-[12px] text-amber-950/90 dark:text-amber-100/90">
              Wayly는 <strong>각 외부 API 무료 한도 대비 사용량이 약 50%에 도달하기 전·즈음</strong>부터
              유료 플랜 안내, 사용량 제한, 또는 기능 조정을 적용할 수 있습니다. 이는{" "}
              <strong>무료 구간을 넘어 유료 구간으로 진입하기 직전</strong>에 서비스가 중단되거나 예상치 못한
              비용이 한꺼번에 발생하는 것을 줄이기 위함입니다.
            </p>
          </section>

          <section ref={guestRef} className="scroll-mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-3 py-3">
            <h3 className="text-[12px] font-bold text-[var(--text-strong)] mb-1.5">게스트 vs 로그인</h3>
            <p className="text-[12px] mb-2">
              게스트는 이 기기에서만 대화가 유지되고, 로그인 시 대화·저장 동선이 계정에 동기화됩니다.
              API 한도는 계정·IP·서비스 정책에 따라 통합 관리될 수 있습니다.
            </p>
            {isGuest && (
              <Link
                href="/login?next=/chat"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[var(--text-on-brand)] text-[12px] font-semibold px-4 py-2.5 hover:opacity-95"
              >
                로그인하고 동기화하기
              </Link>
            )}
          </section>

          <p className="text-[11px] text-[var(--text-muted)] pb-2">
            최종 약관·개인정보처리방침은 사이트 하단 링크를 확인해 주세요. 본 안내는 2026년 기준 정책 방향이며
            변경 시 앱 내 공지합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
