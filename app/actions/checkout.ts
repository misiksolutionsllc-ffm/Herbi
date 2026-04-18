"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { checkoutInputSchema, type CheckoutInput } from "@/lib/validations";

export async function createCheckoutSession(input: CheckoutInput) {
  // 1. Validate shape
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid cart." };
  }

  const { items } = parsed.data;
  const slugs = items.map((i) => i.slug);

  // 2. Re-fetch products from DB (NEVER trust client prices)
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, name, price_cents, stock_level, images, is_active")
    .in("slug", slugs);

  if (error || !products) {
    return { error: "Could not verify cart." };
  }

  // 3. Build Stripe line items from authoritative DB data
  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; images?: string[] };
    };
    quantity: number;
  }> = [];

  for (const item of items) {
    const p = products.find((pr) => pr.slug === item.slug);
    if (!p || !p.is_active) {
      return { error: `Product unavailable: ${item.slug}` };
    }
    if (p.stock_level < item.quantity) {
      return { error: `Not enough stock for ${p.name}.` };
    }
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: p.price_cents,
        product_data: {
          name: p.name,
          images: p.images.slice(0, 1),
        },
      },
      quantity: item.quantity,
    });
  }

  // 4. Create Stripe session
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    shipping_address_collection: { allowed_countries: ["US", "CA"] },
    billing_address_collection: "required",
    automatic_tax: { enabled: false },
    metadata: {
      // Snapshot the authoritative cart so the webhook can rebuild items
      cart: JSON.stringify(
        items.map((i) => ({ slug: i.slug, quantity: i.quantity }))
      ),
    },
  });

  if (!session.url) {
    return { error: "Could not create checkout session." };
  }

  redirect(session.url);
}
