import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/margin-engine";

export const revalidate = 30;
export const metadata = { title: "Orders" };

type SupplierOrderRow = {
  order_id: string;
  supplier_id: string;
  status: string;
  tracking_number: string | null;
  routed_at: string;
  suppliers: { name: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-botanical/10 text-botanical",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-botanical/10 text-botanical",
    shipped: "bg-blue-50 text-blue-700",
    delivered: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-stone-100 text-stone-600",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        colors[status] ?? "bg-ink/10 text-ink/60"
      }`}
    >
      {status}
    </span>
  );
}

export default async function OrdersPage() {
  const supabase = createAdminClient();

  const [ordersRes, supplierOrdersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, customer_email, amount_total, status")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("supplier_orders")
      .select(
        "order_id, supplier_id, status, tracking_number, routed_at, suppliers(name)"
      ),
  ]);

  const orders = ordersRes.data ?? [];
  const routingMap = new Map<string, SupplierOrderRow>();
  for (const so of (supplierOrdersRes.data as SupplierOrderRow[]) ?? []) {
    routingMap.set(so.order_id, so);
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-ink/50 mt-1">
          Customer orders and wholesale supplier routing status
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/60">
              <tr>
                {[
                  "Order ID",
                  "Date",
                  "Customer",
                  "Amount",
                  "Status",
                  "Supplier",
                  "Routing",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-ink/60 tracking-wide uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const routing = routingMap.get(order.id);
                return (
                  <tr
                    key={order.id}
                    className="border-t border-ink/5 hover:bg-mist/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink/50">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-ink/70">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {order.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCents(order.amount_total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/70">
                      {routing?.suppliers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {routing ? (
                        <StatusBadge status={routing.status} />
                      ) : (
                        <span className="text-xs text-ink/30">unrouted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-dashed border-ink/20 rounded-sm py-16 text-center text-ink/40 text-sm">
          No orders yet.
        </div>
      )}
    </div>
  );
}
