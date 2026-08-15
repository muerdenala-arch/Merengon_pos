import { create } from 'zustand';
import type { Sale } from '@/types';
import { api } from '@/lib/api';
import { uid } from '@/lib/utils';

interface SalesState {
  sales: Sale[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  /** A diferencia del resto de las acciones del store, esta SÍ espera al servidor: el
   *  número de ticket es correlativo y atómico entre todos los dispositivos (nextval de
   *  una secuencia en Postgres), así que no se puede inventar de forma optimista sin
   *  arriesgar números repetidos entre dos cajeros cobrando al mismo tiempo. */
  addSale: (sale: Omit<Sale, 'id' | 'ticketNumber'>) => Promise<Sale>;
  salesForSession: (sessionId: string) => Sale[];
}

export const useSalesStore = create<SalesState>()((set, get) => ({
  sales: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const sales = await api.sales.list();
      set({ sales, hydrated: true });
    } catch (err) {
      console.error('No se pudo sincronizar las ventas con el servidor:', err);
    }
  },

  addSale: async (data) => {
    const draft = { ...data, id: uid('sale') };
    const sale = await api.sales.create(draft);
    set((state) => ({ sales: [sale, ...state.sales] }));
    return sale;
  },

  salesForSession: (sessionId) => get().sales.filter((s) => s.registerSessionId === sessionId),
}));
