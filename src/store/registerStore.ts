import { create } from 'zustand';
import type { CashRegisterSession, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';
import { submitSessionOpen, submitSessionClose, setSessionOpenSyncedCallback, setSessionCloseSyncedCallback } from '@/lib/syncManager';

interface RegisterState {
  sessions: CashRegisterSession[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
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
  /** Reemplaza la sesión local por la versión confirmada del servidor (llamado por el
   *  SyncManager cuando una apertura/cierre encolado offline finalmente se sincroniza). */
  reconcileSession: (session: CashRegisterSession) => void;
  /** La caja abierta del usuario logueado — se deriva de la lista sincronizada en vez de
   *  un id local, así que reconoce una caja abierta desde OTRO dispositivo por el mismo
   *  cajero (ej. abrió en la PC y sigue vendiendo desde el celular). Se filtra también por
   *  sucursal: un cajero con turno en varias sucursales no debe heredar la caja abierta de
   *  OTRA sucursal solo por compartir cajero. */
  activeSession: (branchId?: string | null) => CashRegisterSession | null;
}

export const useRegisterStore = create<RegisterState>()((set, get) => ({
  sessions: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const sessions = await api.registerSessions.list();
      set((state) => (state.hydrated && sameData(state.sessions, sessions) ? state : { sessions, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar las cajas con el servidor:', err);
    }
  },

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
    set((state) => ({ sessions: [session, ...state.sessions] }));
    // Encolado con reintento + persistencia offline (IndexedDB) — igual que las ventas.
    // Si esto se perdiera en un fetch directo sin cola, las ventas de este turno luego
    // fallarían para siempre contra el servidor (FK a una sesión que nunca se creó).
    submitSessionOpen({ id: session.id, cashierId: user.id, cashierName: user.name, branchId, openingAmount, notes })
      .catch((err) => console.error('No se pudo encolar la apertura de caja:', err));
    return session;
  },

  closeRegister: (sessionId, data) => {
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
    }));
    submitSessionClose({ id: sessionId, ...data }).catch((err) => console.error('No se pudo encolar el cierre de caja:', err));
  },

  reconcileSession: (session) => {
    set((state) => ({
      sessions: state.sessions.some((s) => s.id === session.id)
        ? state.sessions.map((s) => (s.id === session.id ? session : s))
        : [session, ...state.sessions],
    }));
  },

  activeSession: (branchId) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return null;
    return (
      get().sessions.find(
        (s) => s.cashierId === user.id && s.status === 'abierta' && (!branchId || s.branchId === branchId),
      ) ?? null
    );
  },
}));

// Registrar los callbacks de confirmación con el SyncManager DESPUÉS de crear el store,
// para evitar dependencia circular en el módulo (mismo patrón que salesStore).
setSessionOpenSyncedCallback((session) => useRegisterStore.getState().reconcileSession(session));
setSessionCloseSyncedCallback((session) => useRegisterStore.getState().reconcileSession(session));
