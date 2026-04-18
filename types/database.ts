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
    };
    Views: Record<string, never>;
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
