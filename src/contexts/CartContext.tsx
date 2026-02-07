"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const CART_STORAGE_KEY = "petpaw_cart";

export type CartItemType = "qr_tag" | "pro_subscription";

export interface CartItem {
  type: CartItemType;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (type: CartItemType, product_id?: string) => void;
  updateQuantity: (type: CartItemType, quantity: number, product_id?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
      setLoaded(true);
    }
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    if (loaded && typeof window !== "undefined") {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      // Check if item already exists
      const existingIndex = prev.findIndex(
        (i) => i.type === item.type && i.product_id === item.product_id
      );
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        if (item.type === "pro_subscription") {
          // Pro subscription doesn't stack
          updated[existingIndex].quantity = 1;
        } else {
          updated[existingIndex].quantity += item.quantity;
        }
        return updated;
      }
      // Add new item
      return [...prev, item];
    });
  };

  const removeItem = (type: CartItemType, product_id?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.type === type && i.product_id === product_id))
    );
  };

  const updateQuantity = (type: CartItemType, quantity: number, product_id?: string) => {
    if (quantity <= 0) {
      removeItem(type, product_id);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.type === type && i.product_id === product_id
          ? { ...i, quantity: type === "pro_subscription" ? 1 : quantity }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
