import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { brand } from "@/lib/brand";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40">
        <h1 className="text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.02em] text-balance max-w-3xl fade-up">
          {brand.tagline}
        </h1>
        <p className="mt-8 text-lg text-ink/70 max-w-md fade-up">
          {brand.description}
        </p>
        <Link
          href="/shop"
          className="mt-10 inline-block text-[15px] border-b border-ink pb-1 hover:border-botanical hover:text-botanical transition-colors fade-up"
        >
          See everything
        </Link>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-sm tracking-[0.18em] uppercase text-ink/60">
            New arrivals
          </h2>
          <Link
            href="/shop"
            className="text-sm text-ink/60 hover:text-ink transition-colors"
          >
            All goods →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
          {products?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Story */}
      <section
        id="story"
        className="bg-mist/40 py-24 border-y border-ink/5"
      >
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-sm tracking-[0.18em] uppercase text-ink/60">
            Story
          </p>
          <p className="mt-6 text-2xl md:text-3xl leading-[1.35] tracking-tight text-balance">
            Everything here is made in rooms smaller than your kitchen, by
            people who know the names of the plants they work with.
          </p>
        </div>
      </section>
    </>
  );
}
