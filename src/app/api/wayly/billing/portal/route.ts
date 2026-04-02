import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";
import { getStripe } from "@/lib/wayly/stripe.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: "Stripe가 설정되지 않았습니다." }, { status: 503 });
  }

  const sb = await getServerSupabaseForUser();
  if (!sb) {
    return Response.json({ error: "세션을 확인할 수 없습니다." }, { status: 503 });
  }

  const { data: bill } = await sb
    .from("wayly_billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const customerId = bill?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return Response.json(
      { error: "먼저 Wayly+ 구독 결제를 진행해 주세요." },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get("origin")?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/chat`,
  });

  return Response.json({ url: portal.url });
}
