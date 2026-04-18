"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/database";

export function AddToCart({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const outOfStock = product.stock_level <= 0;

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        disabled={outOfStock}
        onClick={() => {
          add({
            slug: product.slug,
            name: product.name,
            price_cents: product.price_cents,
            image: product.images[0] ?? "",
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 1400);
        }}
      >
        {outOfStock ? "Sold out" : added ? "Added" : "Add to cart"}
      </Button>
      <button
        type="button"
        onClick={() => router.push("/cart")}
        className="text-sm text-ink/60 hover:text-ink transition-colors w-fit"
      >
        View cart →
      </button>
    </div>
  );
}
