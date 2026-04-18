import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { AddToCart } from "@/components/add-to-cart";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Not found" };
  return {
    title: data.name,
    description: data.description ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  const image = product.images[0];
  const meta = product.metadata as Record<string, string | number>;

  return (
    <article className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 md:gap-16">
      <div className="relative aspect-square md:aspect-[4/5] bg-mist overflow-hidden">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="md:pt-8 flex flex-col">
        <h1 className="text-3xl md:text-4xl tracking-[-0.02em]">
          {product.name}
        </h1>
        <p className="mt-3 text-xl text-ink/80 tabular-nums">
          {formatPrice(product.price_cents)}
        </p>

        <p className="mt-8 text-[15px] leading-relaxed text-ink/75 max-w-md">
          {product.description}
        </p>

        {(meta.volume_ml || meta.weight_g || meta.origin) && (
          <dl className="mt-8 grid grid-cols-2 gap-y-2 text-sm max-w-xs">
            {meta.volume_ml && (
              <>
                <dt className="text-ink/50">Volume</dt>
                <dd>{meta.volume_ml} ml</dd>
              </>
            )}
            {meta.weight_g && (
              <>
                <dt className="text-ink/50">Weight</dt>
                <dd>{meta.weight_g} g</dd>
              </>
            )}
            {meta.origin && (
              <>
                <dt className="text-ink/50">Origin</dt>
                <dd>{meta.origin}</dd>
              </>
            )}
          </dl>
        )}

        <div className="mt-10">
          <AddToCart product={product} />
        </div>

        {product.stock_level > 0 && product.stock_level < 10 && (
          <p className="mt-4 text-xs text-botanical">
            Only {product.stock_level} left.
          </p>
        )}
      </div>
    </article>
  );
}
