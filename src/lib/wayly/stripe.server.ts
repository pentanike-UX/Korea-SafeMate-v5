import "server-only";
import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function getStripePriceWaylyPlus(): string | null {
  return process.env.STRIPE_PRICE_WAYLY_PLUS?.trim() || null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}
