import { useEffect, useRef } from 'react';

const MARKER = '__overlay';

/**
 * Hace que el botón "atrás" del teléfono/navegador CIERRE la ventana (modal, menú lateral,
 * carrito) en vez de sacar al usuario de la pantalla o de la app.
 *
 * Al abrirse agrega una entrada al historial con una marca; al apretar "atrás" el navegador
 * consume esa entrada (queda en la misma página) y aquí solo cerramos. Si la ventana se
 * cierra por otro medio (botón X, tocar afuera) se quita la entrada para que el historial
 * no quede con pasos de más.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const token = `${Date.now()}-${Math.random()}`;
    window.history.pushState({ ...(window.history.state ?? {}), [MARKER]: token }, '');

    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop, { once: true });

    return () => {
      window.removeEventListener('popstate', onPop);
      // Cerrada por X / tocando afuera / navegando: si nuestra entrada sigue arriba del
      // historial, la quitamos. Si el usuario ya navegó a otra ruta, no se toca nada.
      if (!closedByBack && window.history.state?.[MARKER] === token) {
        window.history.back();
      }
    };
  }, [open]);
}
