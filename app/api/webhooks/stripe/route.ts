import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export const runtime = "nodejs"; // Stripe SDK needs Node runtime

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    console.error("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Only act on completed checkouts
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = createAdminClient();

  // Reconstruct cart from session metadata
  let cart: Array<{ slug: string; quantity: number }> = [];
  try {
    cart = JSON.parse(session.metadata?.cart ?? "[]");
  } catch {
    console.error("[stripe webhook] could not parse cart metadata");
    return NextResponse.json({ error: "bad metadata" }, { status: 400 });
  }

  // Fetch authoritative product data for the order snapshot
  const slugs = cart.map((c) => c.slug);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("slug, name, price_cents")
    .in("slug", slugs);

  if (prodErr || !products) {
    console.error("[stripe webhook] product lookup failed:", prodErr);
    return NextResponse.json({ error: "product lookup" }, { status: 500 });
  }

  const orderItems = cart.map((line) => {
    const p = products.find((pr) => pr.slug === line.slug);
    return {
      slug: line.slug,
      name: p?.name ?? line.slug,
      quantity: line.quantity,
      unit_amount: p?.price_cents ?? 0,
    };
  });

  // Extract shipping details defensively — field location varies by API version
  const sessionAny = session as unknown as {
    shipping_details?: unknown;
    collected_information?: { shipping_details?: unknown };
    customer_details?: { address?: unknown };
  };
  const shippingAddress =
    sessionAny.shipping_details ??
    sessionAny.collected_information?.shipping_details ??
    sessionAny.customer_details?.address ??
    null;

  // Idempotent insert: unique constraint on stripe_session_id handles replays
  const { data: inserted, error: insertErr } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      customer_email: session.customer_details?.email ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      status: "paid",
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      items: orderItems,
      shipping_address: shippingAddress as Json | null,
    })
    .select("id")
    .single();

  // 23505 = unique_violation (duplicate delivery of same event)
  if (insertErr && insertErr.code !== "23505") {
    console.error("[stripe webhook] order insert failed:", insertErr);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  if (insertErr?.code === "23505") {
    console.log("[stripe webhook] duplicate delivery, already processed");
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Atomic stock decrement — only runs for first successful insert
  for (const line of cart) {
    const { error: stockErr } = await supabase.rpc("decrement_stock", {
      p_slug: line.slug,
      p_qty: line.quantity,
    });
    if (stockErr) {
      // Log but don't fail the webhook — order is recorded, stock can be reconciled
      console.error(
        `[stripe webhook] stock decrement failed for ${line.slug}:`,
        stockErr.message
      );
    }
  }

  console.log(`[stripe webhook] order ${inserted?.id} recorded`);
  return NextResponse.json({ received: true });
}
