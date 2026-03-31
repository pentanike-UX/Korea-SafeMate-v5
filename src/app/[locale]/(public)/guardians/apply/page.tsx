import { GuardianApplyForm } from "@/components/guardian/guardian-apply-form";
import { TrustBoundaryCard } from "@/components/trust/trust-boundary-card";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "가디언으로 활동하기 | 42 Guardians",
  description:
    "가디언은 정해진 범위 내에서 실무 동행 지원을 제공합니다. 매칭/티어는 별도 기준으로 운영됩니다.",
};

export default function GuardianApplyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">가디언으로 활동하기</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          서울을 직접 걷는 로컬의 시선으로, 여행자의 하루를 더 선명하게 만들어 주세요.
        </p>
        {/*
        기존 설명(보존):
        가디언 지원은 로컬 인텔(포스트) 기여를 바탕으로 시작합니다. 매칭 활성화와 상위 티어는 운영 검토
        기준에 따라 별도로 결정되며, 단순 게시량만으로 자동 승격되지 않습니다.
        */}
      </div>

      <div className="mt-10 grid max-w-3xl gap-8">
        <section aria-label="가디언 등급 흐름" className="border-border/60 bg-card/60 rounded-2xl border p-5 shadow-[var(--shadow-sm)]">
          <p className="text-text-strong text-sm font-semibold">가디언 등급 흐름</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
            <div className="border-primary/25 bg-primary/5 flex-1 rounded-xl border p-4">
              <p className="text-primary text-[11px] font-bold tracking-[0.18em] uppercase">지원 시작</p>
              <p className="text-text-strong mt-2 text-sm font-semibold">기여자 (Contributor)</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                지원 후 시작 단계. 포스트를 작성하고 로컬 인사이트를 쌓아요.
              </p>
            </div>

            <div className="text-muted-foreground hidden items-center justify-center sm:flex" aria-hidden>
              <ArrowRight className="size-5" />
            </div>

            <div className="border-border/60 bg-card/40 flex-1 rounded-xl border p-4">
              <p className="text-text-strong text-sm font-semibold">활동 가디언 (Active Guardian)</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                승인된 포스트가 꾸준히 쌓이면 활동 가디언으로 인정됩니다.
              </p>
            </div>

            <div className="text-muted-foreground hidden items-center justify-center sm:flex" aria-hidden>
              <ArrowRight className="size-5" />
            </div>

            <div className="border-border/60 bg-card/40 flex-1 rounded-xl border p-4">
              <p className="text-text-strong text-sm font-semibold">검증 가디언 (Verified Guardian)</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                운영팀 별도 검토 후 부여. 게시물 수만으로는 자동 부여되지 않아요.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="서비스 범위와 한계" className="space-y-3">
          <p className="text-muted-foreground text-sm">지원 전에 활동 범위를 먼저 확인해 주세요.</p>
          <TrustBoundaryCard />
        </section>

        <section aria-label="가디언 지원 폼">
          <GuardianApplyForm />
        </section>
      </div>
    </div>
  );
}
