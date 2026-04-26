import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderItem } from "@/types/database";

type SupplierRow = {
  id: string;
  name: string;
  api_endpoint: string | null;
  is_active: boolean;
};

type ProductWithSupplier = {
  slug: string;
  supplier_id: string | null;
  suppliers: SupplierRow | null;
};

/**
 * Route a paid order to its wholesale supplier.
 *
 * Finds the primary supplier for the order’s products and inserts a
 * supplier_orders row for tracking. If the supplier has an api_endpoint,
 * a fire-and-forget notification is sent.
 */
export async function routeOrderToSupplier(
  orderId: string,
  orderItems: OrderItem[]
): Promise<{ supplierId: string | null; error?: string }> {
  const supabase = createAdminClient();

  const slugs = orderItems.map((i) => i.slug);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("slug, supplier_id, suppliers(id, name, api_endpoint, is_active)")
    .in("slug", slugs)
    .not("supplier_id", "is", null);

  if (prodErr || !products?.length) {
    return { supplierId: null, error: "no supplier linked to order items" };
  }

  const p = products[0] as ProductWithSupplier;

  if (!p.suppliers?.is_active || !p.supplier_id) {
    return { supplierId: null, error: "supplier inactive or missing" };
  }

  const { error: routeErr } = await supabase
    .from("supplier_orders")
    .insert({
      order_id: orderId,
      supplier_id: p.supplier_id,
      status: "pending",
    });

  if (routeErr) {
    return { supplierId: null, error: routeErr.message };
  }

  // Best-effort supplier notification
  if (p.suppliers.api_endpoint) {
    fetch(p.suppliers.api_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, items: orderItems }),
    }).catch(() => undefined);
  }

  return { supplierId: p.supplier_id };
}
