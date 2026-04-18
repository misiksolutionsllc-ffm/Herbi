import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every good we make, in one place.",
};

export const revalidate = 60;

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl tracking-[-0.02em]">Shop</h1>
        <p className="mt-3 text-ink/60">
          {products?.length ?? 0} goods, all made this season.
        </p>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="text-ink/60">Nothing in stock just now.</p>
      )}
    </section>
  );
}
