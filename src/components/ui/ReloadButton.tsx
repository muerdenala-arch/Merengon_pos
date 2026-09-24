import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';

/** Recarga toda la aplicación (trae también la última versión del código) sin tener que
 *  cerrarla y volver a abrirla. Si hay una venta armada en el carrito pide confirmación,
 *  porque el carrito no se guarda al recargar. */
export function ReloadButton({ className }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (useCartStore.getState().items.length > 0) setConfirming(true);
    else window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Recargar la aplicación"
        title="Recargar la aplicación"
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer',
          className,
        )}
      >
        <RefreshCw size={18} />
      </button>
      <ConfirmDialog
        open={confirming}
        title="¿Recargar la aplicación?"
        description="Hay productos en el carrito y se perderían al recargar."
        confirmLabel="Recargar igual"
        tone="danger"
        onConfirm={() => window.location.reload()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
