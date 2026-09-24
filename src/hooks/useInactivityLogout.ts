import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

// Pedido explícito: si nadie toca la tablet/celular en 15 min, cerrar sesión sola y pedir
// el PIN de nuevo — así una sesión abierta no queda expuesta indefinidamente en el mostrador,
// y de paso se evita llegar a la expiración "silenciosa" del token a las 24h (ver
// setSessionExpiredHandler en authStore.ts), que generaba errores confusos en pantallas
// como Reportes en vez de mandar directo al login.
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_EVERY_MS = 20 * 1000;
const STORAGE_KEY = 'pos-merengon/last-activity';

// passive: true porque solo nos interesa SABER que hubo actividad, nunca interceptarla.
const ACTIVITY_EVENTS = ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

function readLastActivity(): number | null {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function stamp() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* sin storage: el intervalo en memoria sigue funcionando */
  }
}

// El contador NO puede ser solo un setTimeout: en celulares/tablets, con la pantalla apagada
// o la app en segundo plano, el navegador congela los timers y la sesión quedaba abierta
// horas. Se guarda la hora de la última actividad y se compara al volver a la app, al
// recargar y cada 20 s.
export function useInactivityLogout() {
  const isLoggedIn = useAuthStore((s) => !!s.currentUser);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    let last = Date.now();
    const isInitial = firstRun.current;
    firstRun.current = false;
    if (isInitial) {
      // App recién abierta con una sesión guardada: si pasó más de 15 min desde el último
      // toque, se pide el PIN de nuevo en vez de dejarla entrar directo.
      const stored = readLastActivity();
      if (stored !== null) last = stored;
    }

    const expired = () => Date.now() - last >= INACTIVITY_TIMEOUT_MS;
    const logoutIfIdle = () => {
      // Tomar el valor guardado por si otra pestaña/ventana de la app registró actividad.
      const stored = readLastActivity();
      if (stored !== null && stored > last) last = stored;
      if (expired()) useAuthStore.getState().logoutForInactivity();
    };

    if (expired()) {
      useAuthStore.getState().logoutForInactivity();
      return;
    }
    // Llegó hasta acá sin vencer: abrir la app cuenta como actividad.
    last = Date.now();
    stamp();

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      last = now;
      if (now - lastWrite > 1000) {
        lastWrite = now;
        stamp();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') logoutIfIdle();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', logoutIfIdle);
    window.addEventListener('pageshow', logoutIfIdle);
    const interval = setInterval(logoutIfIdle, CHECK_EVERY_MS);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity, { capture: true }));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', logoutIfIdle);
      window.removeEventListener('pageshow', logoutIfIdle);
    };
  }, [isLoggedIn]);
}
