import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';

// Cada cuánto se pregunta al servidor si salió una versión nueva de la app. El refresco de
// 10s de useDataSync solo trae DATOS (productos, stock, ventas); el CÓDIGO nuevo solo se
// descargaba al cerrar y volver a abrir la app, y un POS que queda abierto todo el día
// nunca lo hacía.
const CHECK_INTERVAL_MS = 30_000;
const IDLE_BEFORE_RELOAD_MS = 20_000;

let lastActivity = Date.now();

function bundleOf(html: string): string | null {
  return html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null;
}

/** Detecta una versión nueva de la app y la aplica sola cuando es seguro: sin nada en el
 *  carrito y sin que nadie esté tocando la pantalla, para no perder una venta a medias.
 *  Devuelve true mientras haya una actualización esperando ese momento. */
export function useAppUpdate(): { updateReady: boolean; applyNow: () => void } {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const running = document
      .querySelector('script[type="module"][src*="/assets/index-"]')
      ?.getAttribute('src');
    if (!running) return; // modo desarrollo: no hay bundle con hash
    const runningPath = new URL(running, window.location.origin).pathname;

    const touch = () => { lastActivity = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const latest = bundleOf(await res.text());
        if (!cancelled && latest && latest !== runningPath) setUpdateReady(true);
      } catch {
        /* sin conexión: se reintenta en el próximo ciclo */
      }
    }

    const checkTimer = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onVisible);
    check();

    return () => {
      cancelled = true;
      clearInterval(checkTimer);
      document.removeEventListener('visibilitychange', onVisible);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, []);

  useEffect(() => {
    if (!updateReady) return;
    const timer = setInterval(() => {
      const cartEmpty = useCartStore.getState().items.length === 0;
      const idleEnough = Date.now() - lastActivity >= IDLE_BEFORE_RELOAD_MS;
      // No recargar con un formulario o ventana abierta: se perdería lo que se está cargando.
      const tag = document.activeElement?.tagName ?? '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const modalOpen = !!document.querySelector('.fixed.inset-0');
      if (cartEmpty && idleEnough && !typing && !modalOpen) window.location.reload();
    }, 3_000);
    return () => clearInterval(timer);
  }, [updateReady]);

  return { updateReady, applyNow: () => window.location.reload() };
}
