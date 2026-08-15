import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sale } from '@/types';
import { uid } from '@/lib/utils';

interface SalesState {
  sales: Sale[];
  lastTicketNumber: number;
  addSale: (sale: Omit<Sale, 'id' | 'ticketNumber'>) => Sale;
  salesForSession: (sessionId: string) => Sale[];
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: [],
      lastTicketNumber: 1000,
      addSale: (data) => {
        const ticketNumber = get().lastTicketNumber + 1;
        const sale: Sale = { ...data, id: uid('sale'), ticketNumber };
        set((state) => ({ sales: [sale, ...state.sales], lastTicketNumber: ticketNumber }));
        return sale;
      },
      salesForSession: (sessionId) => get().sales.filter((s) => s.registerSessionId === sessionId),
    }),
    {
      name: 'pos-jugueria/sales',
      version: 1,
      // v0 -> v1: las ventas no tenían sucursal. Se asignan a "central" para conservar
      // el historial de ventas registrado antes de esta actualización.
      migrate: (persisted) => {
        const state = persisted as { sales?: Array<Record<string, unknown>> };
        return {
          ...state,
          sales: (state.sales ?? []).map((s) => ('branchId' in s ? s : { ...s, branchId: 'central' })),
        };
      },
    },
  ),
);
