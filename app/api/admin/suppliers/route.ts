import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// CRUD for wholesale suppliers.
// Protect this behind auth middleware before going to production.

const supplierSchema = z.object({
  name: z.string().min(1).max(100),
  contact_email: z.string().email().optional(),
  api_endpoint: z.string().url().optional(),
  api_key_hash: z.string().optional(),
  reliability_score: z.number().min(0).max(1).default(1.0),
  notes: z.string().optional(),
});

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, contact_email, reliability_score, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...parsed.data, is_active: true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
