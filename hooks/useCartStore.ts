"use client";

import { CartItem } from "@/types/cart.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartStore {
  items: CartItem[];
  shippingEmail: string;
  isEmailValid: boolean;
  isAddressValid: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setShippingEmail: (email: string) => void;
  setEmailValid: (valid: boolean) => void;
  setAddressValid: (valid: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      shippingEmail: "",
      isEmailValid: false,
      isAddressValid: false,
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      setShippingEmail: (email) => set({ shippingEmail: email }),
      setEmailValid: (valid) => set({ isEmailValid: valid }),
      setAddressValid: (valid) => set({ isAddressValid: valid }),
    }),
    {
      name: "cart-storage",
    },
  ),
);
