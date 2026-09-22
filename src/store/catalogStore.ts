import { create } from 'zustand';
import { PRODUCTS, TOPPINGS } from '@/data/seed';
import type { Product, Topping, Category } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

interface CatalogState {
  products: Product[];
  toppings: Topping[];
  categories: Category[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  createCategory: (name: string) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<void>;
  upsertProduct: (product: Product) => void;
  createProduct: (data: Omit<Product, 'id'>) => Product;
  removeProduct: (id: string) => void;
  toggleActive: (id: string) => void;
  adjustStock: (id: string, branchId: string, delta: number) => void;
  setStock: (id: string, branchId: string, value: number) => void;
  adjustToppingStock: (id: string, branchId: string, delta: number) => void;
  setToppingStock: (id: string, branchId: string, value: number) => void;
  /** Solo actualiza el estado local (sin red) — para reflejar al instante un descuento de
   *  stock que el SERVIDOR ya aplicó atómicamente como parte de otra operación (ej. una
   *  venta: ver api/sales.ts). No usar para ajustes que deban persistirse por su cuenta. */
  applyLocalStockDelta: (id: string, branchId: string, delta: number) => void;
  applyLocalToppingStockDelta: (id: string, branchId: string, delta: number) => void;
  stockFor: (product: Pick<Product, 'stockByBranch'>, branchId: string) => number;
  /** CRUD de toppings */
  createTopping: (data: Omit<Topping, 'id'>) => Topping;
  upsertTopping: (topping: Topping) => void;
  deleteTopping: (id: string) => void;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: PRODUCTS,
  toppings: TOPPINGS,
  categories: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const [products, toppings, categories] = await Promise.all([
        api.products.list(),
        api.toppings.list(),
        api.categories.list()
      ]);
      set((state) => {
        if (state.hydrated && sameData(state.products, products) && sameData(state.toppings, toppings) && sameData(state.categories, categories)) {
          return state;
        }
        return { products, toppings, categories, hydrated: true };
      });
    } catch (err) {
      console.error('No se pudo sincronizar el catálogo con el servidor:', err);
    }
  },

  createCategory: async (name: string) => {
    try {
      const cat = await api.categories.create({ name });
      set((state) => ({ categories: [...state.categories, cat] }));
      return cat;
    } catch (err) {
      console.error('No se pudo crear la categoría:', err);
      return null;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await api.categories.remove(id);
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    } catch (err) {
      console.error('No se pudo eliminar la categoría:', err);
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
  // Los 4 métodos de abajo mandan `stockOp` (ajuste atómico de UNA sucursal resuelto en la
  // propia query SQL) en vez del objeto `stockByBranch` completo — así dos ajustes
  // concurrentes (dos cajeros, o un cajero + un retiro de bodega) nunca se pisan entre sí
  // ni pisan el stock de otras sucursales. El estado local se actualiza optimistamente para
  // que la UI responda al instante, y se reconcilia con lo que devuelve el servidor.
  adjustStock: (id, branchId, delta) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const optimistic = Math.max(0, (product.stockByBranch[branchId] ?? 0) + delta);
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stockByBranch: { ...p.stockByBranch, [branchId]: optimistic } } : p,
      ),
    }));
    api.products.update(id, { stockOp: { branchId, delta } })
      .then((updated) => set((state) => ({ products: state.products.map((p) => (p.id === id ? updated : p)) })))
      .catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  setStock: (id, branchId, value) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const optimistic = Math.max(0, value);
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stockByBranch: { ...p.stockByBranch, [branchId]: optimistic } } : p,
      ),
    }));
    api.products.update(id, { stockOp: { branchId, set: value } })
      .then((updated) => set((state) => ({ products: state.products.map((p) => (p.id === id ? updated : p)) })))
      .catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  adjustToppingStock: (id, branchId, delta) => {
    const topping = get().toppings.find((t) => t.id === id);
    if (!topping) return;
    const optimistic = Math.max(0, (topping.stockByBranch[branchId] ?? 0) + delta);
    set((state) => ({
      toppings: state.toppings.map((t) =>
        t.id === id ? { ...t, stockByBranch: { ...t.stockByBranch, [branchId]: optimistic } } : t,
      ),
    }));
    api.toppings.update(id, { stockOp: { branchId, delta } })
      .then((updated) => set((state) => ({ toppings: state.toppings.map((t) => (t.id === id ? updated : t)) })))
      .catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  setToppingStock: (id, branchId, value) => {
    const topping = get().toppings.find((t) => t.id === id);
    if (!topping) return;
    const optimistic = Math.max(0, value);
    set((state) => ({
      toppings: state.toppings.map((t) =>
        t.id === id ? { ...t, stockByBranch: { ...t.stockByBranch, [branchId]: optimistic } } : t,
      ),
    }));
    api.toppings.update(id, { stockOp: { branchId, set: value } })
      .then((updated) => set((state) => ({ toppings: state.toppings.map((t) => (t.id === id ? updated : t)) })))
      .catch((err) => console.error('No se pudo ajustar el stock:', err));
  },
  applyLocalStockDelta: (id, branchId, delta) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id
          ? { ...p, stockByBranch: { ...p.stockByBranch, [branchId]: Math.max(0, (p.stockByBranch[branchId] ?? 0) + delta) } }
          : p,
      ),
    }));
  },
  applyLocalToppingStockDelta: (id, branchId, delta) => {
    set((state) => ({
      toppings: state.toppings.map((t) =>
        t.id === id
          ? { ...t, stockByBranch: { ...t.stockByBranch, [branchId]: Math.max(0, (t.stockByBranch[branchId] ?? 0) + delta) } }
          : t,
      ),
    }));
  },
  stockFor: (product, branchId) => product.stockByBranch[branchId] ?? 0,

  createTopping: (data) => {
    const topping: Topping = { ...data, id: uid('top') };
    set((state) => ({ toppings: [...state.toppings, topping] }));
    api.toppings.create(topping).catch((err) => console.error('No se pudo crear el topping:', err));
    return topping;
  },
  upsertTopping: (topping) => {
    set((state) => ({
      toppings: state.toppings.some((t) => t.id === topping.id)
        ? state.toppings.map((t) => (t.id === topping.id ? topping : t))
        : [...state.toppings, topping],
    }));
    api.toppings.update(topping.id, topping).catch((err) => console.error('No se pudo guardar el topping:', err));
  },
  deleteTopping: (id) => {
    set((state) => ({ toppings: state.toppings.filter((t) => t.id !== id) }));
    api.toppings.remove(id).catch((err) => console.error('No se pudo eliminar el topping:', err));
  },
}));
