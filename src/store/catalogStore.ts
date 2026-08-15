import { create } from 'zustand';
import { PRODUCTS, TOPPINGS } from '@/data/seed';
import type { Product, Topping } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

interface CatalogState {
  products: Product[];
  toppings: Topping[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  upsertProduct: (product: Product) => void;
  createProduct: (data: Omit<Product, 'id'>) => Product;
  removeProduct: (id: string) => void;
  toggleActive: (id: string) => void;
  adjustStock: (id: string, branchId: string, delta: number) => void;
  setStock: (id: string, branchId: string, value: number) => void;
  adjustToppingStock: (id: string, branchId: string, delta: number) => void;
  setToppingStock: (id: string, branchId: string, value: number) => void;
  stockFor: (product: Pick<Product, 'stockByBranch'>, branchId: string) => number;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: PRODUCTS,
  toppings: TOPPINGS,
  hydrated: false,

  fetchAll: async () => {
    try {
      const [products, toppings] = await Promise.all([api.products.list(), api.toppings.list()]);
      set((state) => {
        if (state.hydrated && sameData(state.products, products) && sameData(state.toppings, toppings)) {
          return state;
        }
        return { products, toppings, hydrated: true };
      });
    } catch (err) {
      console.error('No se pudo sincronizar el catálogo con el servidor:', err);
    }
  },

  upsertProduct: (product) => {
    set((state) => ({
      products: state.products.some((p) => p.id === product.id)
        ? state.products.map((p) => (p.id === product.id ? product : p))
        : [...state.products, product],
    }));
    api.products.update(product.id, product).catch((err) => console.error('No se pudo guardar el producto:', err));
  },
  createProduct: (data) => {
    const product: Product = { ...data, id: uid('prod') };
    set((state) => ({ products: [...state.products, product] }));
    api.products.create(product).catch((err) => console.error('No se pudo crear el producto:', err));
    return product;
  },
  removeProduct: (id) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    api.products.remove(id).catch((err) => console.error('No se pudo eliminar el producto:', err));
  },
  toggleActive: (id) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const active = !product.active;
    set((state) => ({ products: state.products.map((p) => (p.id === id ? { ...p, active } : p)) }));
    api.products.update(id, { active }).catch((err) => console.error('No se pudo actualizar el producto:', err));
  },
  adjustStock: (id, branchId, delta) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const stockByBranch = {
      ...product.stockByBranch,
      [branchId]: Math.max(0, (product.stockByBranch[branchId] ?? 0) + delta),
    };
    set((state) => ({ products: state.products.map((p) => (p.id === id ? { ...p, stockByBranch } : p)) }));
    api.products.update(id, { stockByBranch }).catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  setStock: (id, branchId, value) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const stockByBranch = { ...product.stockByBranch, [branchId]: Math.max(0, value) };
    set((state) => ({ products: state.products.map((p) => (p.id === id ? { ...p, stockByBranch } : p)) }));
    api.products.update(id, { stockByBranch }).catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  adjustToppingStock: (id, branchId, delta) => {
    const topping = get().toppings.find((t) => t.id === id);
    if (!topping) return;
    const stockByBranch = {
      ...topping.stockByBranch,
      [branchId]: Math.max(0, (topping.stockByBranch[branchId] ?? 0) + delta),
    };
    set((state) => ({ toppings: state.toppings.map((t) => (t.id === id ? { ...t, stockByBranch } : t)) }));
    api.toppings.update(id, { stockByBranch }).catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  setToppingStock: (id, branchId, value) => {
    const topping = get().toppings.find((t) => t.id === id);
    if (!topping) return;
    const stockByBranch = { ...topping.stockByBranch, [branchId]: Math.max(0, value) };
    set((state) => ({ toppings: state.toppings.map((t) => (t.id === id ? { ...t, stockByBranch } : t)) }));
    api.toppings.update(id, { stockByBranch }).catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  stockFor: (product, branchId) => product.stockByBranch[branchId] ?? 0,
}));
