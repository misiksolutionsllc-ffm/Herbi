"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

export function ClearCart() {
  useEffect(() => {
    // Ensure store rehydrated before clearing, then wipe cart
    useCart.persist.rehydrate();
    const t = setTimeout(() => useCart.getState().clear(), 50);
    return () => clearTimeout(t);
  }, []);
  return null;
}
