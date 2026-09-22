import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  /** Sucursal en la que el usuario logueado está operando esta sesión/turno. */
  currentBranchId: string | null;
  /** Token firmado por el servidor (ver api/_lib/auth.ts) — se manda como
   *  `Authorization: Bearer` en las rutas que mutan datos. */
  token: string | null;
  error: string | null;
  loading: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  setCurrentBranch: (branchId: string) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentBranchId: null,
      token: null,
      error: null,
      loading: false,
      loginWithPin: async (pin: string) => {
        // El PIN se valida en el SERVIDOR (nunca se compara contra una lista de PINs
        // bajada al navegador) — ver api/staff.ts `action=login`. El estado "bloqueado"
        // ya lo filtra el propio SELECT del servidor (status = 'activo').
        set({ loading: true, error: null });
        try {
          const { user, token } = await api.staff.login(pin);
          // Con una sola sucursal asignada, entra directo; si tiene varias, queda sin
          // definir hasta que LoginPage muestre el selector y llame a setCurrentBranch.
          const autoBranch = user.branchIds.length === 1 ? user.branchIds[0] : null;
          setAuthToken(token);
          set({ currentUser: user, currentBranchId: autoBranch, token, error: null, loading: false });
          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'PIN incorrecto. Intenta nuevamente.';
          set({ error: msg, loading: false });
          return false;
        }
      },
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
      logout: () => {
        setAuthToken(null);
        set({ currentUser: null, currentBranchId: null, token: null });
      },
      clearError: () => set({ error: null }),
    }),
    { name: 'pos-merengon/auth' },
  ),
);

// Restaurar el token en el módulo de API al recargar la página — `persist` ya rehidrató
// el store de forma síncrona (localStorage) para cuando esta línea corre.
setAuthToken(useAuthStore.getState().token);
