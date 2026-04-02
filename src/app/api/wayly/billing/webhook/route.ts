import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/wayly/stripe.server";
import {
  planTierFromSubscription,
  upsertWaylyBillingRow,
} from "@/lib/wayly/billing-sync.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const whSecret = getStripeWebhookSecret();
  if (!stripe || !whSecret) {
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (e) {
    console.error("[stripe webhook] verify", e);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          session.metadata?.supabase_user_id ||
          null;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (!userId || !customerId) break;

        const subRef = session.subscription;
        const subId =
          typeof subRef === "string" ? subRef : subRef && "id" in subRef ? subRef.id : null;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertWaylyBillingRow({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            planTier: planTierFromSubscription(sub),
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
          });
        } else {
          await upsertWaylyBillingRow({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            planTier: "free",
            currentPeriodEnd: null,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        if (!userId) break;

        if (event.type === "customer.subscription.deleted") {
          await upsertWaylyBillingRow({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            planTier: "canceled",
            currentPeriodEnd: null,
          });
        } else {
          await upsertWaylyBillingRow({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            planTier: planTierFromSubscription(sub),
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler", e);
    return Response.json({ error: "Handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}
