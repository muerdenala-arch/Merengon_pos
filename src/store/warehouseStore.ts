import { create } from 'zustand';
import { api } from '@/lib/api';
import type { StockMovement } from '@/types';

interface WarehouseState {
  movements: StockMovement[];
  loadingMovements: boolean;
  hydrated: boolean;
  fetchMovements: () => Promise<void>;
  recordMovement: (data: StockMovement) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>()((set, get) => ({
  movements: [],
  loadingMovements: false,
  hydrated: false,
  fetchMovements: async () => {
    set({ loadingMovements: true });
    try {
      const movements = await api.stockMovements.list('bodega', undefined, 200);
      set({ movements, hydrated: true });
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      set({ loadingMovements: false });
    }
  },
  recordMovement: async (data) => {
    try {
      const created = await api.stockMovements.create(data);
      set((state) => ({ movements: [created, ...state.movements] }));
    } catch (err) {
      console.error('Error recording stock movement:', err);
      throw err;
    }
  }
}));
