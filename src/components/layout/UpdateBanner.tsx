import { useAppUpdate } from '@/hooks/useAppUpdate';

/** Aviso de versión nueva. La app se actualiza sola cuando el carrito está vacío y nadie
 *  toca la pantalla; si hay una venta en curso, espera y deja el botón para hacerlo a mano. */
export function UpdateBanner() {
  const { updateReady, applyNow } = useAppUpdate();
  if (!updateReady) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[99999] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl">
      <span>🆕 Hay una versión nueva — se actualiza sola al terminar la venta</span>
      <button
        onClick={applyNow}
        className="cursor-pointer rounded-lg bg-primary-500 px-3 py-1 text-xs font-bold text-white"
      >
        Actualizar ahora
      </button>
    </div>
  );
}
