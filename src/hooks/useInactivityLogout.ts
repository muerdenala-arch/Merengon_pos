import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// Pedido explícito: si nadie toca la tablet/celular en 15 min, cerrar sesión sola y pedir
// el PIN de nuevo — así una sesión abierta no queda expuesta indefinidamente en el mostrador,
// y de paso se evita llegar a la expiración "silenciosa" del token a las 24h (ver
// setSessionExpiredHandler en authStore.ts), que generaba errores confusos en pantallas
// como Reportes en vez de mandar directo al login.
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// passive: true porque solo nos interesa SABER que hubo actividad, nunca interceptarla.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'wheel'] as const;

export function useInactivityLogout() {
  const isLoggedIn = useAuthStore((s) => !!s.currentUser);

  useEffect(() => {
    if (!isLoggedIn) return;

    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        useAuthStore.getState().logoutForInactivity();
      }, INACTIVITY_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isLoggedIn]);
}
