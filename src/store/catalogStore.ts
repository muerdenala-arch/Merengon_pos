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
  adjustStock: (id: string, branchId: string, delta: number) => void;
  setStock: (id: string, branchId: string, value: number) => void;
  adjustToppingStock: (id: string, branchId: string, delta: number) => void;
  setToppingStock: (id: string, branchId: string, value: number) => void;
  stockFor: (product: Pick<Product, 'stockByBranch'>, branchId: string) => number;
  resetCatalog: () => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
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
      adjustStock: (id, branchId, delta) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stockByBranch: {
                    ...p.stockByBranch,
                    [branchId]: Math.max(0, (p.stockByBranch[branchId] ?? 0) + delta),
                  },
                }
              : p,
          ),
        })),
      setStock: (id, branchId, value) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, stockByBranch: { ...p.stockByBranch, [branchId]: Math.max(0, value) } } : p,
          ),
        })),
      adjustToppingStock: (id, branchId, delta) =>
        set((state) => ({
          toppings: state.toppings.map((t) =>
            t.id === id
              ? {
                  ...t,
                  stockByBranch: {
                    ...t.stockByBranch,
                    [branchId]: Math.max(0, (t.stockByBranch[branchId] ?? 0) + delta),
                  },
                }
              : t,
          ),
        })),
      setToppingStock: (id, branchId, value) =>
        set((state) => ({
          toppings: state.toppings.map((t) =>
            t.id === id ? { ...t, stockByBranch: { ...t.stockByBranch, [branchId]: Math.max(0, value) } } : t,
          ),
        })),
      stockFor: (product, branchId) => product.stockByBranch[branchId] ?? 0,
      resetCatalog: () => set({ products: PRODUCTS, toppings: TOPPINGS }),
    }),
    {
      name: 'pos-jugueria/catalog',
      version: 1,
      // v0 -> v1: el stock era un número plano por producto/topping; ahora es por
      // sucursal. El valor viejo pasa íntegro a "central" para no perder existencias.
      migrate: (persisted) => {
        const state = persisted as { products?: unknown[]; toppings?: unknown[] };
        const migrateItem = (item: Record<string, unknown>) => {
          if ('stockByBranch' in item) return item;
          const { stock, ...rest } = item as { stock?: number };
          return { ...rest, stockByBranch: { central: stock ?? 0 } };
        };
        return {
          ...state,
          products: (state.products ?? []).map((p) => migrateItem(p as Record<string, unknown>)),
          toppings: (state.toppings ?? []).map((t) => migrateItem(t as Record<string, unknown>)),
        };
      },
    },
  ),
);
