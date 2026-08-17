import { useEffect } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';

/** "Tiempo real" vía polling: cada cuánto se vuelve a pedir todo a Neon. 6s sigue siendo
 *  casi instantáneo para un POS, pero reduce el trabajo de fondo (6 requests + parseo de
 *  JSON) en celulares de gama media — cada store además solo re-renderiza si el dato
 *  realmente cambió (ver src/lib/sync.ts), así que esto es una segunda capa del mismo
 *  ajuste, no la única. */
const POLL_INTERVAL_MS = 6000;

/** Dispara el primer fetch de todos los datos compartidos al montar la app y los
 *  refresca en bucle — así cualquier cambio hecho desde otro dispositivo (otra sucursal,
 *  otro cajero, el panel admin) llega a esta pantalla sin recargar.
 *
 *  El polling se PAUSA mientras la pestaña/pantalla no está visible (tablet bloqueada,
 *  app en segundo plano) — un POS queda con la pestaña abierta un turno entero (8h+), y
 *  sin esto son ~4800 rondas de 6 fetches + parseo JSON por turno corriendo igual aunque
 *  nadie esté mirando la pantalla, lo que va acumulando trabajo de fondo y puede sentirse
 *  como que "el sistema se pone lento" a medida que avanza el día. Al volver a hacerse
 *  visible se dispara un fetch inmediato para no mostrar datos viejos. */
export function useDataSync() {
  useEffect(() => {
    const fetchAll = () => {
      useBranchStore.getState().fetchAll();
      useStaffStore.getState().fetchAll();
      useCatalogStore.getState().fetchAll();
      useQrCodeStore.getState().fetchAll();
      useRegisterStore.getState().fetchAll();
      useSalesStore.getState().fetchAll();
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      fetchAll();
      intervalId = setInterval(fetchAll, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/** true una vez que las seis fuentes de datos ya trajeron su primera respuesta real del
 *  servidor — se usa para no mostrar la semilla local (que puede no coincidir con lo que
 *  hay en Neon) ni una pantalla de login sin usuarios durante el primer instante. */
export function useIsDataHydrated(): boolean {
  const branches = useBranchStore((s) => s.hydrated);
  const staff = useStaffStore((s) => s.hydrated);
  const catalog = useCatalogStore((s) => s.hydrated);
  const qrCodes = useQrCodeStore((s) => s.hydrated);
  const registerSessions = useRegisterStore((s) => s.hydrated);
  const sales = useSalesStore((s) => s.hydrated);
  return branches && staff && catalog && qrCodes && registerSessions && sales;
}
