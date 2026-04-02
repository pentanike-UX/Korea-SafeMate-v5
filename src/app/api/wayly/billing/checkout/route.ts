import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";
import { setStripeCustomerIdOnly } from "@/lib/wayly/billing-sync.server";
import { getStripe, getStripePriceWaylyPlus } from "@/lib/wayly/stripe.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const stripe = getStripe();
  const priceId = getStripePriceWaylyPlus();
  if (!stripe || !priceId) {
    return Response.json(
      { error: "결제가 아직 설정되지 않았습니다. STRIPE_SECRET_KEY·STRIPE_PRICE_WAYLY_PLUS를 확인하세요." },
      { status: 503 },
    );
  }

  const sb = await getServerSupabaseForUser();
  if (!sb) {
    return Response.json({ error: "세션을 확인할 수 없습니다." }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  const email = user?.email ?? undefined;

  const { data: bill } = await sb
    .from("wayly_billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId = bill?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await setStripeCustomerIdOnly(userId, customerId);
  }

  const origin =
    req.headers.get("origin")?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/chat?billing=success`,
    cancel_url: `${origin}/chat?billing=cancel`,
    metadata: { supabase_user_id: userId },
    subscription_data: {
      metadata: { supabase_user_id: userId },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return Response.json({ error: "Checkout URL을 만들지 못했습니다." }, { status: 500 });
  }

  return Response.json({ url: session.url });
}
