"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpicinessLevel {
  id: number;
  label: string;
  level: number;
  deskripsi: string | null;
  extraHarga: number;
}

export interface Topping {
  id: number;
  nama: string;
  harga: number;
  isAvailable: boolean;
}

export interface Product {
  id: number;
  nama: string;
  deskripsi: string | null;
  harga: number;
  gambarUrl: string | null;
  rating: number;
  badge: string | null;
  stok: number;
  isAvailable: boolean;
  categoryId: number;
  category?: { id: number; nama: string; icon: string | null };
}

export interface CartItem {
  cartItemId: string; // uuid-like unique key
  product: Product;
  quantity: number;
  spicinessLevel: SpicinessLevel;
  toppings: Topping[];
  catatan: string;
  subtotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcSubtotal(
  product: Product,
  toppings: Topping[],
  quantity: number,
  spicinessExtraHarga: number
): number {
  const toppingTotal = toppings.reduce((s, t) => s + t.harga, 0);
  return (product.harga + toppingTotal + spicinessExtraHarga) * quantity;
}

function uniqueId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CartStore {
  // Data
  items: CartItem[];
  spicinessLevels: SpicinessLevel[];
  toppings: Topping[];

  // UI State
  isCartOpen: boolean;
  isModalOpen: boolean;
  selectedProduct: Product | null;

  // Data Setters (called once on dashboard load)
  setSpicinessLevels: (levels: SpicinessLevel[]) => void;
  setToppings: (toppings: Topping[]) => void;

  // UI Actions
  openModal: (product: Product) => void;
  closeModal: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Cart Actions
  addItem: (args: {
    product: Product;
    quantity: number;
    spicinessLevel: SpicinessLevel;
    toppings: Topping[];
    catatan?: string;
  }) => void;
  removeItem: (cartItemId: string) => void;
  updateQty: (cartItemId: string, delta: number) => void;
  clearCart: () => void;

  // Computed getters
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ── State ──
      items: [],
      spicinessLevels: [],
      toppings: [],
      isCartOpen: false,
      isModalOpen: false,
      selectedProduct: null,

      // ── Data setters ──
      setSpicinessLevels: (levels) => set({ spicinessLevels: levels }),
      setToppings: (toppings) => set({ toppings }),

      // ── UI ──
      openModal: (product) =>
        set({ isModalOpen: true, selectedProduct: product }),
      closeModal: () => set({ isModalOpen: false, selectedProduct: null }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // ── Cart ──
      addItem: ({ product, quantity, spicinessLevel, toppings, catatan = "" }) => {
        const subtotal = calcSubtotal(
          product,
          toppings,
          quantity,
          spicinessLevel.extraHarga
        );
        const newItem: CartItem = {
          cartItemId: uniqueId(),
          product,
          quantity,
          spicinessLevel,
          toppings,
          catatan,
          subtotal,
        };
        set((state) => ({
          items: [...state.items, newItem],
          isModalOpen: false,
          selectedProduct: null,
          isCartOpen: true, // auto-open cart after adding
        }));
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      updateQty: (cartItemId, delta) =>
        set((state) => ({
          items: state.items
            .map((item) => {
              if (item.cartItemId !== cartItemId) return item;
              const newQty = item.quantity + delta;
              if (newQty < 1) return null;
              return {
                ...item,
                quantity: newQty,
                subtotal: calcSubtotal(
                  item.product,
                  item.toppings,
                  newQty,
                  item.spicinessLevel.extraHarga
                ),
              };
            })
            .filter(Boolean) as CartItem[],
        })),

      clearCart: () => set({ items: [] }),

      // ── Computed ──
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalPrice: () => get().items.reduce((s, i) => s + i.subtotal, 0),
    }),
    {
      name: "mie-level-cart",
      // Only persist cart items, not UI state
      partialize: (state) => ({ items: state.items }),
    }
  )
);
