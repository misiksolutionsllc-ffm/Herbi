import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;
export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const supabase = createAdminClient();

  const [suppliersRes, productsRes] = await Promise.all([
    supabase.from("suppliers").select("*").order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("supplier_id, price_cents, wholesale_cost_cents")
      .not("supplier_id", "is", null),
  ]);

  const suppliers = suppliersRes.data ?? [];
  const products = productsRes.data ?? [];

  // Per-supplier product count and average margin
  const statsMap = new Map<string, { count: number; totalMarginPct: number }>();
  for (const p of products) {
    if (!p.supplier_id) continue;
    const prev = statsMap.get(p.supplier_id) ?? { count: 0, totalMarginPct: 0 };
    const marginPct =
      p.price_cents && p.wholesale_cost_cents
        ? ((p.price_cents - p.wholesale_cost_cents) / p.price_cents) * 100
        : 0;
    statsMap.set(p.supplier_id, {
      count: prev.count + 1,
      totalMarginPct: prev.totalMarginPct + marginPct,
    });
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-sm text-ink/50 mt-1">
          Wholesale partners powering the platform
        </p>
      </div>

      {suppliers.length > 0 ? (
        <div className="border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/60">
              <tr>
                {["Name", "Products", "Avg Margin", "Reliability", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-ink/60 tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const stats = statsMap.get(s.id);
                const avgMargin = stats
                  ? (stats.totalMarginPct / stats.count).toFixed(1)
                  : null;
                return (
                  <tr
                    key={s.id}
                    className="border-t border-ink/5 hover:bg-mist/20"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      {s.contact_email && (
                        <div className="text-xs text-ink/40 mt-0.5">
                          {s.contact_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {stats?.count ?? 0}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-botanical font-medium">
                      {avgMargin ? `${avgMargin}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-mist rounded-full overflow-hidden">
                          <div
                            className="h-full bg-botanical rounded-full"
                            style={{
                              width: `${s.reliability_score * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-ink/50">
                          {(s.reliability_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          s.is_active
                            ? "bg-botanical/10 text-botanical"
                            : "bg-ink/10 text-ink/50"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-dashed border-ink/20 rounded-sm py-16 text-center text-ink/40 text-sm">
          No suppliers yet. Run migration 0005 or POST to{" "}
          <code className="font-mono">/api/admin/suppliers</code> to add one.
        </div>
      )}

      {/* Margin engine reference card */}
      <div className="mt-8 border border-ink/10 rounded-sm p-6">
        <h2 className="text-xs font-medium tracking-widest uppercase text-ink/50 mb-4">
          Margin Engine
        </h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-ink/40 uppercase tracking-wide mb-1">
              Optimal Price Formula
            </div>
            <code className="text-xs bg-mist px-2 py-1 rounded-xs">
              retail = wholesale / (1 − margin%)
            </code>
          </div>
          <div>
            <div className="text-xs text-ink/40 uppercase tracking-wide mb-1">
              Default Target Margin
            </div>
            <div className="font-semibold text-botanical">30%</div>
          </div>
          <div>
            <div className="text-xs text-ink/40 uppercase tracking-wide mb-1">
              Ranking Weights
            </div>
            <div className="text-xs text-ink/70">
              60% cost efficiency · 40% reliability
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
