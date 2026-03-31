import { GuardianApplyForm } from "@/components/guardian/guardian-apply-form";
import { TrustBoundaryCard } from "@/components/trust/trust-boundary-card";

export const metadata = {
  title: "가디언으로 활동하기 | 42 Guardians",
  description:
    "가디언은 정해진 범위 내에서 실무 동행 지원을 제공합니다. 매칭/티어는 별도 기준으로 운영됩니다.",
};

export default function GuardianApplyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">가디언으로 활동하기</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          가디언 지원은 로컬 인텔(포스트) 기여를 바탕으로 시작합니다. 매칭 활성화와 상위 티어는 운영 검토
          기준에 따라 별도로 결정되며, 단순 게시량만으로 자동 승격되지 않습니다.
        </p>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <GuardianApplyForm />
        <TrustBoundaryCard />
      </div>
    </div>
  );
}
