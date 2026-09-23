import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken, setSessionExpiredHandler } from '@/lib/api';
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
  /** Vuelve a la pantalla de "elegir sucursal" para un cajero con varias asignadas —
   *  sin cerrar sesión. Solo tiene sentido antes de abrir caja (ver CashierShell). */
  clearCurrentBranch: () => void;
  logout: () => void;
  clearError: () => void;
  /** El servidor respondió 401 (token vencido o inválido) — cierra sesión y avisa por qué,
   *  a diferencia de logout() que es la salida manual sin mensaje. */
  sessionExpired: () => void;
  /** Nadie tocó la pantalla en 15 min — cierra sesión sola para no dejar una tablet/celular
   *  con una cuenta abierta indefinidamente si alguien se aleja del mostrador (ver
   *  useInactivityLogout). También evita, de paso, llegar a la expiración de 24h del token. */
  logoutForInactivity: () => void;
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
      clearCurrentBranch: () => set({ currentBranchId: null }),
      logout: () => {
        setAuthToken(null);
        set({ currentUser: null, currentBranchId: null, token: null });
      },
      clearError: () => set({ error: null }),
      sessionExpired: () => {
        setAuthToken(null);
        set({
          currentUser: null,
          currentBranchId: null,
          token: null,
          error: 'Tu sesión expiró. Ingresa tu PIN nuevamente.',
        });
      },
      logoutForInactivity: () => {
        setAuthToken(null);
        set({
          currentUser: null,
          currentBranchId: null,
          token: null,
          error: 'Sesión cerrada por inactividad. Ingresa tu PIN para continuar.',
        });
      },
    }),
    { name: 'pos-merengon/auth' },
  ),
);

// Restaurar el token en el módulo de API al recargar la página — `persist` ya rehidrató
// el store de forma síncrona (localStorage) para cuando esta línea corre.
setAuthToken(useAuthStore.getState().token);

// Si cualquier llamada a la API responde 401 (token vencido tras 24h, o sesión inválida),
// cerrar sesión automáticamente en vez de dejar a la persona atrapada viendo pantallas que
// fallan para siempre sin importar cuántas veces le dé "Reintentar" — ver setSessionExpiredHandler.
setSessionExpiredHandler(() => {
  if (useAuthStore.getState().currentUser) {
    useAuthStore.getState().sessionExpired();
  }
});
