import { create } from 'zustand';
import type { CartItem, CartModifiers, Product } from '@/types';
import { uid } from '@/lib/utils';

function computeUnitPrice(product: Product, modifiers: CartModifiers): number {
  const toppingsTotal = modifiers.toppings.reduce((sum, t) => sum + t.priceExtra, 0);
  // If product has sizes, use the selected size's price; fallback to basePrice for simple products
  const sizePrice = product.sizes && product.sizes.length > 0
    ? (modifiers.size?.price ?? product.basePrice)
    : product.basePrice;
  return sizePrice + toppingsTotal;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, modifiers: CartModifiers, quantity?: number, notes?: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product, modifiers, quantity = 1, notes) => {
    const unitPrice = computeUnitPrice(product, modifiers);
    const item: CartItem = {
      lineId: uid('line'),
      product,
      modifiers,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      notes,
    };
    set((state) => ({ items: [...state.items, item] }));
  },
  updateQuantity: (lineId, quantity) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
            : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  removeItem: (lineId) =>
    set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) })),
  clear: () => set({ items: [] }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),
  total: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),
  count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
