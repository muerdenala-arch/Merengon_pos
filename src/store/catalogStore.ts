import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRODUCTS, TOPPINGS } from '@/data/seed';
import type { Product, Topping } from '@/types';
import { uid } from '@/lib/utils';

interface CatalogState {
  products: Product[];
  toppings: Topping[];
  upsertProduct: (product: Product) => void;
  createProduct: (data: Omit<Product, 'id'>) => Product;
  removeProduct: (id: string) => void;
  toggleActive: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  setStock: (id: string, value: number) => void;
  adjustToppingStock: (id: string, delta: number) => void;
  resetCatalog: () => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      products: PRODUCTS,
      toppings: TOPPINGS,
      upsertProduct: (product) =>
        set((state) => ({
          products: state.products.some((p) => p.id === product.id)
            ? state.products.map((p) => (p.id === product.id ? product : p))
            : [...state.products, product],
        })),
      createProduct: (data) => {
        const product: Product = { ...data, id: uid('prod') };
        set((state) => ({ products: [...state.products, product] }));
        return product;
      },
      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
      toggleActive: (id) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        })),
      adjustStock: (id, delta) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
          ),
        })),
      setStock: (id, value) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, value) } : p,
          ),
        })),
      adjustToppingStock: (id, delta) =>
        set((state) => ({
          toppings: state.toppings.map((t) =>
            t.id === id ? { ...t, stock: Math.max(0, t.stock + delta) } : t,
          ),
        })),
      resetCatalog: () => set({ products: PRODUCTS, toppings: TOPPINGS }),
    }),
    { name: 'pos-jugueria/catalog' },
  ),
);
