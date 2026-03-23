import { GuardianApplyForm } from "@/components/guardian/guardian-apply-form";
import { TrustBoundaryCard } from "@/components/trust/trust-boundary-card";

export const metadata = {
  title: "Become a Guardian | Korea SafeMate",
  description:
    "Contributor onboarding — intel first; Active/Verified tiers and matching are separate gates.",
};

export default function GuardianApplyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Become a Guardian</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          Open signup starts as contribution to local intel. Active Guardian reflects sustained
          approved posts; Verified Guardian + matching is a separate trust track — not unlocked by
          volume alone.
        </p>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <GuardianApplyForm />
        <TrustBoundaryCard />
      </div>
    </div>
  );
}
