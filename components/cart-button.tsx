"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useHydratedCart } from "@/hooks/use-hydration";

export function CartButton() {
  const hydrated = useHydratedCart();
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 text-sm text-ink/70 hover:text-ink transition-colors"
      aria-label="Cart"
    >
      <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
      {hydrated && count > 0 && (
        <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 text-[11px] font-medium bg-botanical text-paper rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
