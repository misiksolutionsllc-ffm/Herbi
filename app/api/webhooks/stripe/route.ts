import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { routeOrderToSupplier } from "@/lib/order-router";
import type { Json, OrderItem } from "@/types/database";

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

  // Rebuild the cart from Stripe line items (slug stamped in product_data.metadata)
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });

  const orderItems: OrderItem[] = (fullSession.line_items?.data ?? []).map(
    (li) => {
      const product = li.price?.product as Stripe.Product | undefined;
      return {
        slug: product?.metadata?.slug ?? "",
        name: product?.name ?? "",
        quantity: li.quantity ?? 0,
        unit_amount: li.price?.unit_amount ?? 0,
      };
    }
  );

  if (orderItems.some((i) => !i.slug)) {
    console.error("[stripe webhook] line item missing slug metadata");
    return NextResponse.json({ error: "bad line items" }, { status: 400 });
  }

  // Extract shipping address defensively across API versions
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

  // 23505 = unique_violation (duplicate webhook delivery)
  if (insertErr && insertErr.code !== "23505") {
    console.error("[stripe webhook] order insert failed:", insertErr);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  if (insertErr?.code === "23505") {
    console.log("[stripe webhook] duplicate delivery, already processed");
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Atomic batch stock decrement
  const { error: stockErr } = await supabase.rpc("decrement_stock_batch", {
    p_items: orderItems.map((i) => ({ slug: i.slug, qty: i.quantity })),
  });

  if (stockErr) {
    console.error(
      `[stripe webhook] RECONCILE order=${inserted?.id} stock decrement failed:`,
      stockErr.message
    );
  }

  // Route order to wholesale supplier (intermediary platform core step)
  if (inserted?.id) {
    const { supplierId, error: routeErr } = await routeOrderToSupplier(
      inserted.id,
      orderItems
    );
    if (routeErr) {
      console.warn(
        `[stripe webhook] order=${inserted.id} routing warning: ${routeErr}`
      );
    } else {
      console.log(
        `[stripe webhook] order ${inserted.id} routed to supplier ${supplierId}`
      );
    }
  }

  console.log(`[stripe webhook] order ${inserted?.id} recorded`);
  return NextResponse.json({ received: true });
}
