/**
 * syncManager.ts
 * Motor de sincronización en segundo plano.
 * Lee la cola de IndexedDB y envía las ventas pendientes a la API de Neon.
 *
 * Llama a startSyncManager() UNA SOLA VEZ al iniciar la app (main.tsx).
 * Internamente se suscribe a los eventos online/offline del navegador.
 *
 * NO importa salesStore directamente para evitar dependencia circular.
 * En cambio, el salesStore se registra mediante setSaleConfirmCallback().
 */
import { enqueueSale, getPendingQueue, removePendingEntry, incrementRetry, getPendingCount } from './offlineDb';
import type { Sale } from '@/types';

type SyncListener = (pendingCount: number, isOnline: boolean) => void;
type ConfirmCallback = (localId: string, confirmedSale: Sale) => void;

const MAX_RETRIES = 5;
const listeners: SyncListener[] = [];

let _started = false;
let _isFlushing = false;
let _confirmCallback: ConfirmCallback | null = null;

/**
 * Llamar desde salesStore para registrar la función que actualiza
 * el ticket temporal por el número real de Neon.
 * Esto evita la dependencia circular syncManager ↔ salesStore.
 */
export function setSaleConfirmCallback(cb: ConfirmCallback) {
  _confirmCallback = cb;
}

/** Suscribirse a cambios de estado (pendientes / online). */
export function onSyncStateChange(cb: SyncListener) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

async function notifyListeners() {
  const count = await getPendingCount();
  const isOnline = navigator.onLine;
  for (const cb of listeners) cb(count, isOnline);
}

/**
 * Intenta enviar una sola venta a la API.
 * Retorna la venta confirmada si tuvo éxito, null si falló.
 */
async function pushSale(sale: Sale): Promise<Sale | null> {
  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      // 409 Conflict = ya existe en Neon (idempotencia). Tratamos como éxito.
      if (res.status === 409) {
        const existing = await res.json().catch(() => null);
        return existing as Sale | null;
      }
      return null;
    }
    return (await res.json()) as Sale;
  } catch {
    return null;
  }
}

/**
 * Procesa toda la cola de IndexedDB y sincroniza con Neon.
 * Si no hay internet, sale inmediatamente.
 * Evita ejecuciones concurrentes con el flag _isFlushing.
 */
export async function flushQueue(): Promise<void> {
  if (_isFlushing || !navigator.onLine) return;
  _isFlushing = true;

  try {
    const queue = await getPendingQueue();
    if (queue.length === 0) return;

    for (const entry of queue) {
      if (!navigator.onLine) break;

      if (entry.retryCount >= MAX_RETRIES) {
        console.warn('[SyncManager] Entrada con demasiados reintentos, omitiendo:', entry.id);
        continue;
      }

      const confirmedSale = await pushSale(entry.sale);

      if (confirmedSale) {
        // Notificar al salesStore para actualizar el ticket temporal
        _confirmCallback?.(entry.sale.id, confirmedSale);
        await removePendingEntry(entry.id);
      } else {
        await incrementRetry(entry.id);
      }
    }
  } finally {
    _isFlushing = false;
    await notifyListeners();
  }
}

/** Registra la venta en IndexedDB y dispara sync si hay conexión. */
export async function submitSale(sale: Sale): Promise<void> {
  await enqueueSale(sale);
  await notifyListeners();
  // fire & forget — no bloquea la UI
  flushQueue().catch(console.error);
}

/** Inicia el manager. Llamar UNA VEZ en main.tsx. */
export function startSyncManager(): void {
  if (_started) return;
  _started = true;

  window.addEventListener('online', () => {
    console.info('[SyncManager] Conexión recuperada — procesando cola...');
    flushQueue().catch(console.error);
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    console.warn('[SyncManager] Sin conexión.');
    notifyListeners();
  });

  // Al iniciar con red, vaciar cola de sesiones anteriores
  if (navigator.onLine) {
    setTimeout(() => flushQueue().catch(console.error), 2000);
  }

  console.info('[SyncManager] Iniciado.');
}
