import { useEffect, useRef } from 'react';

const MARKER = '__overlay';

/**
 * Hace que el botón/gesto "atrás" del teléfono CIERRE la ventana abierta (modal, menú
 * lateral, carrito) en vez de sacar al usuario de la pantalla o de la app.
 *
 * Al abrirse una ventana se agrega una entrada al historial; "atrás" la consume y solo se
 * cierra la ventana. Si la ventana se cierra por otro medio (X, tocar afuera, un botón) esa
 * entrada se quita con history.back().
 *
 * OJO con el orden: history.back() es ASÍNCRONO. Si una ventana se cierra y otra se abre en
 * el mismo instante (ej. el carrito móvil se cierra y se abre "Cobrar"), el popstate de la
 * primera llegaba cuando la segunda ya estaba abierta y la cerraba sola — el cajero veía que
 * "Cobrar" no abría. Por eso todo pasa por UN solo control global: los retrocesos propios se
 * cuentan y se ignoran, y las ventanas nuevas esperan a que el retroceso pendiente termine.
 */
interface Entry {
  token: string;
  close: () => void;
  pushed: boolean;
  cancelled: boolean;
  closedByBack: boolean;
}

const stack: Entry[] = [];
let pendingBacks = 0;
let queued: Array<() => void> = [];
let installed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
  if (pendingBacks > 0) return;
  const q = queued;
  queued = [];
  q.forEach((fn) => fn());
}

function ownBackDone() {
  if (pendingBacks > 0) pendingBacks--;
  if (pendingBacks === 0 && safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  flushQueue();
}

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener('popstate', () => {
    // Retroceso provocado por nosotros al cerrar una ventana: no es del usuario.
    if (pendingBacks > 0) {
      ownBackDone();
      return;
    }
    // "Atrás" del usuario: cierra la ventana de más arriba (si hay alguna).
    const top = stack.pop();
    if (top) {
      top.closedByBack = true;
      top.close();
    }
  });
}

function goBackOnce() {
  pendingBacks++;
  window.history.back();
  // Si el navegador no llega a avisar (ej. no había entrada a la que volver), no dejar
  // ventanas nuevas esperando para siempre.
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => {
    pendingBacks = 0;
    safetyTimer = null;
    flushQueue();
  }, 500);
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    install();

    const entry: Entry = {
      token: `${Date.now()}-${Math.random()}`,
      close: () => closeRef.current(),
      pushed: false,
      cancelled: false,
      closedByBack: false,
    };

    const push = () => {
      if (entry.cancelled) return;
      window.history.pushState({ ...(window.history.state ?? {}), [MARKER]: entry.token }, '');
      entry.pushed = true;
      stack.push(entry);
    };
    if (pendingBacks > 0) queued.push(push);
    else push();

    return () => {
      entry.cancelled = true;
      if (!entry.pushed) return;
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      // Cerrada por X / tocando afuera / un botón: quitar nuestra entrada del historial,
      // salvo que el usuario ya haya navegado a otra ruta encima.
      if (!entry.closedByBack && window.history.state?.[MARKER] === entry.token) {
        goBackOnce();
      }
    };
  }, [open]);
}
