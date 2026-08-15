import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStaffStore } from '@/store/staffStore';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  error: string | null;
  loginWithPin: (pin: string) => boolean;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      error: null,
      loginWithPin: (pin: string) => {
        // Solo el personal con estado "activo" puede iniciar sesión; los usuarios
        // bloqueados quedan fuera aunque el PIN sea correcto.
        const found = useStaffStore.getState().users.find((u) => u.pin === pin && u.status === 'activo');
        if (found) {
          set({ currentUser: found, error: null });
          return true;
        }
        set({ error: 'PIN incorrecto. Intenta nuevamente.' });
        return false;
      },
      logout: () => set({ currentUser: null }),
      clearError: () => set({ error: null }),
    }),
    { name: 'pos-jugueria/auth' },
  ),
);
