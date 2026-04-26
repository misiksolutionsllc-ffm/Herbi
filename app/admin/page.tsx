import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/margin-engine";
import { StatCard } from "@/components/admin/stat-card";
import type { PlatformMetricsDay } from "@/types/database";

export const revalidate = 60;
export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [metricsRes, paidCountRes, suppliersCountRes, routedCountRes] =
    await Promise.all([
      supabase.from("platform_metrics_daily").select("*").limit(30),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid"),
      supabase
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("supplier_orders")
        .select("id", { count: "exact", head: true }),
    ]);

  const daily: PlatformMetricsDay[] = metricsRes.data ?? [];

  const totalRevenue = daily.reduce((s, d) => s + d.revenue_cents, 0);
  const totalWholesale = daily.reduce(
    (s, d) => s + d.wholesale_cost_cents,
    0
  );
  const totalProfit = daily.reduce((s, d) => s + d.profit_cents, 0);
  const marginPct =
    totalRevenue > 0
      ? ((totalProfit / totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform Overview
        </h1>
        <p className="text-sm text-ink/50 mt-1">
          AI-Powered Intermediary · Last 30 days
        </p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCents(totalRevenue)} />
        <StatCard
          label="Gross Profit"
          value={formatCents(totalProfit)}
          highlight
        />
        <StatCard label="Avg Margin" value={`${marginPct}%`} />
        <StatCard
          label="Wholesale Cost"
          value={formatCents(totalWholesale)}
          muted
        />
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Paid Orders"
          value={String(paidCountRes.count ?? 0)}
        />
        <StatCard
          label="Active Suppliers"
          value={String(suppliersCountRes.count ?? 0)}
        />
        <StatCard
          label="Routed to Supplier"
          value={String(routedCountRes.count ?? 0)}
        />
        <StatCard label="Platform" value="AI Live" highlight />
      </div>

      {/* Daily breakdown */}
      {daily.length > 0 ? (
        <div>
          <h2 className="text-xs tracking-widest uppercase text-ink/50 mb-4">
            Daily Breakdown
          </h2>
          <div className="border border-ink/10 rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-mist/60">
                <tr>
                  {[
                    "Date",
                    "Orders",
                    "Revenue",
                    "Wholesale",
                    "Profit",
                    "Margin",
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
                {daily.map((row) => {
                  const margin =
                    row.revenue_cents > 0
                      ? (
                          (row.profit_cents / row.revenue_cents) *
                          100
                        ).toFixed(1)
                      : "0.0";
                  return (
                    <tr
                      key={row.day}
                      className="border-t border-ink/5 hover:bg-mist/20"
                    >
                      <td className="px-4 py-3 tabular-nums text-ink/70">
                        {new Date(row.day).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.order_count}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatCents(row.revenue_cents)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink/60">
                        {formatCents(row.wholesale_cost_cents)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-botanical font-medium">
                        {formatCents(row.profit_cents)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-ink/20 rounded-sm py-16 text-center text-ink/40 text-sm">
          No paid orders yet. Revenue and profit metrics appear here once
          orders come in.
        </div>
      )}
    </div>
  );
}
