// Types for the Herbi Supabase schema.
// Regenerate with: pnpm dlx supabase gen types typescript --project-id <id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  images: string[];
  stock_level: number;
  metadata: Json;
  is_active: boolean;
  wholesale_cost_cents: number | null;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  slug: string;
  name: string;
  quantity: number;
  unit_amount: number; // cents
};

export type Order = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  customer_email: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  status: "pending" | "paid" | "shipped" | "refunded" | "failed";
  amount_total: number;
  currency: string;
  items: Json;
  shipping_address: Json | null;
};

export type Supplier = {
  id: string;
  name: string;
  contact_email: string | null;
  api_endpoint: string | null;
  api_key_hash: string | null;
  reliability_score: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierOrder = {
  id: string;
  order_id: string;
  supplier_id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "failed";
  tracking_number: string | null;
  routed_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  notes: string | null;
};

export type PlatformMetricsDay = {
  day: string;
  order_count: number;
  revenue_cents: number;
  wholesale_cost_cents: number;
  profit_cents: number;
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at">>;
        Relationships: [];
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Supplier, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      supplier_orders: {
        Row: SupplierOrder;
        Insert: Omit<SupplierOrder, "id" | "routed_at">;
        Update: Partial<Omit<SupplierOrder, "id" | "order_id" | "supplier_id">>;
        Relationships: [];
      };
    };
    Views: {
      platform_metrics_daily: {
        Row: PlatformMetricsDay;
      };
    };
    Functions: {
      decrement_stock: {
        Args: { p_slug: string; p_qty: number };
        Returns: Product;
      };
      decrement_stock_batch: {
        Args: { p_items: Json };
        Returns: Product[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
