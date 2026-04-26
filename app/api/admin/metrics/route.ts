import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin metrics endpoint — returns last 30 days of platform data.
// Protect this behind auth middleware before going to production.
export async function GET() {
  const supabase = createAdminClient();

  const [metricsRes, ordersRes, suppliersRes] = await Promise.all([
    supabase.from("platform_metrics_daily").select("*").limit(30),
    supabase
      .from("orders")
      .select("id, status, amount_total, created_at, customer_email")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("suppliers")
      .select("id, name, reliability_score, is_active")
      .eq("is_active", true),
  ]);

  return NextResponse.json({
    daily: metricsRes.data ?? [],
    recentOrders: ordersRes.data ?? [],
    suppliers: suppliersRes.data ?? [],
  });
}
