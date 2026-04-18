"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { useHydratedCart } from "@/hooks/use-hydration";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/app/actions/checkout";

export default function CartPage() {
  const hydrated = useHydratedCart();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hydrated) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl tracking-[-0.02em]">Cart</h1>
        <p className="mt-6 text-ink/50">Loading…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl tracking-[-0.02em]">Cart</h1>
        <p className="mt-6 text-ink/60">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block text-[15px] border-b border-ink pb-1 hover:border-botanical hover:text-botanical"
        >
          Go shopping →
        </Link>
      </section>
    );
  }

  const onCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession({
        items: items.map((i) => ({ slug: i.slug, quantity: i.quantity })),
      });
      if (result && "error" in result) setError(result.error);
    });
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl md:text-4xl tracking-[-0.02em]">Cart</h1>

      <ul className="mt-10 divide-y divide-ink/10">
        {items.map((item) => (
          <li key={item.slug} className="py-6 flex gap-5">
            <div className="relative w-24 h-28 bg-mist flex-shrink-0 overflow-hidden">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px]">{item.name}</h3>
                  <p className="mt-1 text-sm text-ink/60 tabular-nums">
                    {formatPrice(item.price_cents)}
                  </p>
                </div>
                <button
                  onClick={() => remove(item.slug)}
                  className="text-ink/40 hover:text-ink"
                  aria-label="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center border border-ink/15">
                  <button
                    onClick={() => setQty(item.slug, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-ink/5"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => setQty(item.slug, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-ink/5"
                    aria-label="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[15px] tabular-nums">
                  {formatPrice(item.price_cents * item.quantity)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 pt-6 border-t border-ink/10">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Taxes and shipping calculated at checkout.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 px-3 py-2">
            {error}
          </p>
        )}

        <Button
          size="lg"
          onClick={onCheckout}
          disabled={pending}
          className="mt-6 w-full"
        >
          {pending ? "Redirecting…" : "Continue to checkout"}
        </Button>
      </div>
    </section>
  );
}
