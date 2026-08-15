import { useEffect } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';

/** "Tiempo real" vía polling: cada cuánto se vuelve a pedir todo a Neon. 4s es suficiente
 *  para que una venta, un ajuste de stock o un bloqueo de usuario se vea en las demás
 *  pantallas casi al instante, sin la complejidad de mantener un WebSocket/canal propio. */
const POLL_INTERVAL_MS = 4000;

/** Dispara el primer fetch de todos los datos compartidos al montar la app y los
 *  refresca en bucle — así cualquier cambio hecho desde otro dispositivo (otra sucursal,
 *  otro cajero, el panel admin) llega a esta pantalla sin recargar. */
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

    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
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
