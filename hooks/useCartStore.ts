"use client";

import { CartItem } from "@/types/cart.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartStore {
  items: CartItem[];
  shippingEmail: string;
  shippingState: string;
  isEmailValid: boolean;
  isAddressValid: boolean;
  currentProductPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setShippingEmail: (email: string) => void;
  setShippingState: (state: string) => void;
  setEmailValid: (valid: boolean) => void;
  setAddressValid: (valid: boolean) => void;
  setCurrentProductPrice: (price: number) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      shippingEmail: "",
      shippingState: "",
      isEmailValid: false,
      isAddressValid: false,
      currentProductPrice: 0,
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
      clearCart: () => set({ items: [], currentProductPrice: 0 }),
      setShippingEmail: (email) => set({ shippingEmail: email }),
      setShippingState: (state) => set({ shippingState: state }),
      setEmailValid: (valid) => set({ isEmailValid: valid }),
      setAddressValid: (valid) => set({ isAddressValid: valid }),
      setCurrentProductPrice: (price) => set({ currentProductPrice: price }),
    }),
    {
      name: "cart-storage",
    },
  ),
);
