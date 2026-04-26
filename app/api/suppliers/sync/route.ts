import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Supplier product-sync endpoint.
// Wholesale sellers POST here to update stock levels and wholesale costs.
// Auth: Authorization: Bearer <api_key_hash stored in suppliers row>

const syncSchema = z.object({
  supplier_id: z.string().uuid(),
  products: z.array(
    z.object({
      slug: z.string().min(1),
      stock_level: z.number().int().min(0),
      wholesale_cost_cents: z.number().int().min(0).optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { supplier_id, products } = parsed.data;
  const supabase = createAdminClient();

  // Verify supplier exists and token matches stored api_key_hash
  const { data: supplier, error: supplierErr } = await supabase
    .from("suppliers")
    .select("id, api_key_hash, is_active")
    .eq("id", supplier_id)
    .single();

  if (supplierErr || !supplier || !supplier.is_active) {
    return NextResponse.json({ error: "supplier not found" }, { status: 404 });
  }

  if (supplier.api_key_hash && token !== supplier.api_key_hash) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Batch-update product stock and wholesale cost
  const results = await Promise.allSettled(
    products.map(async (p) => {
      const update: Record<string, unknown> = { stock_level: p.stock_level };
      if (p.wholesale_cost_cents !== undefined) {
        update.wholesale_cost_cents = p.wholesale_cost_cents;
      }
      return supabase
        .from("products")
        .update(update)
        .eq("slug", p.slug)
        .eq("supplier_id", supplier_id);
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  const synced = results.length - failed;

  return NextResponse.json({ synced, failed });
}
