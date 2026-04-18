"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

/**
 * Call once in any component that needs cart state.
 * Returns true only after zustand persist has rehydrated from localStorage.
 * Combine with a `mounted` gate to avoid hydration mismatches.
 */
export function useHydratedCart() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCart.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
