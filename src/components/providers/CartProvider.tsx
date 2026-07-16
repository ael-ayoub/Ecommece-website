"use client";

import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import type { CartItem } from "@/types/cart";

const STORAGE_KEY = "cart";

interface CartState {
  items: CartItem[];
  /** True once localStorage has been read — avoids flashing "0 items" before hydration. */
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "UPDATE_QUANTITY"; id: string; quantity: number }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items, hydrated: true };

    case "ADD": {
      const cappedQty = Math.min(action.quantity, action.item.stockQuantity);
      if (cappedQty <= 0) return state;

      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + cappedQty, existing.stockQuantity);
        return {
          ...state,
          items: state.items.map((i) => (i.id === existing.id ? { ...i, quantity: newQty } : i)),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: cappedQty }] };
    }

    case "UPDATE_QUANTITY": {
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id
            ? { ...i, quantity: Math.max(1, Math.min(action.quantity, i.stockQuantity)) }
            : i,
        ),
      };
    }

    case "REMOVE":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case "CLEAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], hydrated: false });
  const hasHydrated = useRef(false);

  // Load from localStorage once, on mount (client-only — guest and logged-in
  // users share this same mechanism for v1, per this phase's locked scope).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as (CartItem & { variantId?: number })[]) : [];
      dispatch({
        type: "HYDRATE",
        items: parsed
          .map((item) => ({
            ...item,
            productVariantId: item.productVariantId ?? item.variantId ?? 0,
            sku: item.sku ?? "LEGACY",
          }))
          .filter((item) => item.productVariantId > 0),
      });
    } catch {
      dispatch({ type: "HYDRATE", items: [] });
    }
  }, []);

  // Persist on every change, but only after the initial hydration read —
  // otherwise the empty initial state would overwrite a real stored cart.
  useEffect(() => {
    if (!state.hydrated) return;
    hasHydrated.current = true;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, state.hydrated]);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const value: CartContextValue = {
    items: state.items,
    hydrated: state.hydrated,
    itemCount,
    subtotal,
    addItem: (item, quantity = 1) => dispatch({ type: "ADD", item, quantity }),
    updateQuantity: (id, quantity) => dispatch({ type: "UPDATE_QUANTITY", id, quantity }),
    removeItem: (id) => dispatch({ type: "REMOVE", id }),
    clearCart: () => dispatch({ type: "CLEAR" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
