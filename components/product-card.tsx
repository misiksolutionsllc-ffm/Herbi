import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block fade-up"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-[15px] tracking-tight">{product.name}</h3>
        <span className="text-[15px] text-ink/70 tabular-nums">
          {formatPrice(product.price_cents)}
        </span>
      </div>
    </Link>
  );
}
