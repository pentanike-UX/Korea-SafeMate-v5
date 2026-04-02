import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";
import { normalizePlanTier, waylyUsageLimits } from "@/lib/wayly/usage-config.server";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const sb = await getServerSupabaseForUser();
  if (!sb) {
    return Response.json({ error: "데이터베이스를 사용할 수 없습니다." }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: usageRow } = await sb
    .from("wayly_usage_daily")
    .select(
      "gemini_generations, gemini_est_input_tokens, gemini_est_output_tokens, routing_live_calls, routing_naver_live_calls",
    )
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const { data: billingRow } = await sb
    .from("wayly_billing_customers")
    .select("plan_tier, current_period_end, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const tier = normalizePlanTier(billingRow?.plan_tier);
  const limits = waylyUsageLimits(tier);

  const g = usageRow?.gemini_generations ?? 0;
  const r = usageRow?.routing_live_calls ?? 0;
  const n = usageRow?.routing_naver_live_calls ?? 0;

  const pct = (used: number, cap: number) =>
    cap <= 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));

  return Response.json({
    date: today,
    planTier: tier,
    billing: {
      hasStripeCustomer: Boolean(billingRow?.stripe_customer_id),
      hasActiveSubscription: Boolean(billingRow?.stripe_subscription_id),
      currentPeriodEnd: billingRow?.current_period_end ?? null,
    },
    usage: {
      geminiGenerations: g,
      geminiEstInputTokens: Number(usageRow?.gemini_est_input_tokens ?? 0),
      geminiEstOutputTokens: Number(usageRow?.gemini_est_output_tokens ?? 0),
      routingLiveCalls: r,
      naverLiveCalls: n,
    },
    limits,
    percent: {
      gemini: pct(g, limits.geminiGenerationsPerDay),
      routing: pct(r, limits.routingLivePerDay),
      naver: pct(n, limits.naverLivePerDay),
    },
    stripeReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_WAYLY_PLUS),
  });
}
