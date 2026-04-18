import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  slug: string;
  name: string;
  price_cents: number;
  image: string;
  quantity: number;
};

type CartState = {
  items: CartLine[];
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (line, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.slug === line.slug);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.slug === line.slug
                  ? { ...i, quantity: Math.min(i.quantity + qty, 99) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...line, quantity: qty }] };
        }),
      remove: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
      setQty: (slug, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.slug !== slug)
              : state.items.map((i) =>
                  i.slug === slug
                    ? { ...i, quantity: Math.min(quantity, 99) }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "herbi-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // we rehydrate manually client-side to avoid SSR mismatch
    }
  )
);
