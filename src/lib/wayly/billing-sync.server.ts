import "server-only";
import type Stripe from "stripe";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";

export type WaylyPlanTier = "free" | "plus" | "past_due" | "canceled";

export function planTierFromSubscription(
  sub: Stripe.Subscription,
): WaylyPlanTier {
  const s = sub.status;
  if (s === "active" || s === "trialing") return "plus";
  if (s === "past_due") return "past_due";
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "canceled";
  return "free";
}

export async function upsertWaylyBillingRow(opts: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  planTier: WaylyPlanTier;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  const sb = createServiceRoleSupabase();
  if (!sb) {
    console.error("[wayly billing] service role supabase unavailable");
    return;
  }
  const { error } = await sb.from("wayly_billing_customers").upsert(
    {
      user_id: opts.userId,
      stripe_customer_id: opts.stripeCustomerId,
      stripe_subscription_id: opts.stripeSubscriptionId,
      plan_tier: opts.planTier,
      current_period_end: opts.currentPeriodEnd?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[wayly billing upsert]", error.message);
}

export async function setStripeCustomerIdOnly(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const sb = createServiceRoleSupabase();
  if (!sb) return;
  const { error } = await sb.from("wayly_billing_customers").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      plan_tier: "free",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[wayly billing customer]", error.message);
}
