import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CashRegisterSession, User } from '@/types';
import { uid } from '@/lib/utils';

interface RegisterState {
  sessions: CashRegisterSession[];
  activeSessionId: string | null;
  openRegister: (user: User, branchId: string, openingAmount: number, notes?: string) => CashRegisterSession;
  closeRegister: (
    sessionId: string,
    data: {
      closingAmountCounted: number;
      expectedAmount: number;
      salesTotal: number;
      salesCount: number;
      cashSalesTotal: number;
      qrSalesTotal: number;
      notes?: string;
    },
  ) => void;
  activeSession: () => CashRegisterSession | null;
}

export const useRegisterStore = create<RegisterState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      openRegister: (user, branchId, openingAmount, notes) => {
        const session: CashRegisterSession = {
          id: uid('reg'),
          cashierId: user.id,
          cashierName: user.name,
          branchId,
          openedAt: new Date().toISOString(),
          openingAmount,
          status: 'abierta',
          notes,
        };
        set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: session.id }));
        return session;
      },
      closeRegister: (sessionId, data) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  status: 'cerrada',
                  closedAt: new Date().toISOString(),
                  closingAmountCounted: data.closingAmountCounted,
                  expectedAmount: data.expectedAmount,
                  difference: data.closingAmountCounted - data.expectedAmount,
                  salesTotal: data.salesTotal,
                  salesCount: data.salesCount,
                  cashSalesTotal: data.cashSalesTotal,
                  qrSalesTotal: data.qrSalesTotal,
                  notes: data.notes ?? s.notes,
                }
              : s,
          ),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        })),
      activeSession: () => get().sessions.find((s) => s.id === get().activeSessionId) ?? null,
    }),
    {
      name: 'pos-jugueria/register',
      version: 1,
      // v0 -> v1: las sesiones de caja no tenían sucursal. Se asignan a "central" para
      // conservar el historial de aperturas/cierres previo a esta actualización.
      migrate: (persisted) => {
        const state = persisted as { sessions?: Array<Record<string, unknown>> };
        return {
          ...state,
          sessions: (state.sessions ?? []).map((s) => ('branchId' in s ? s : { ...s, branchId: 'central' })),
        };
      },
    },
  ),
);
