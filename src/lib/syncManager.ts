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
import { enqueueSale, enqueueExpense, getPendingQueue, removePendingEntry, incrementRetry, getPendingCount } from './offlineDb';
import type { Sale, Expense } from '@/types';

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
 */
export function setSaleConfirmCallback(cb: ConfirmCallback) {
  _confirmCallback = cb;
}

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

async function pushSale(sale: Sale): Promise<Sale | null> {
  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
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

async function pushExpense(expense: Expense): Promise<Expense | null> {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      if (res.status === 409) {
        const existing = await res.json().catch(() => null);
        return existing as Expense | null;
      }
      return null;
    }
    return (await res.json()) as Expense;
  } catch {
    return null;
  }
}

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

      let success = false;

      if (entry.type === 'sale' && entry.sale) {
        const confirmedSale = await pushSale(entry.sale);
        if (confirmedSale) {
          _confirmCallback?.(entry.sale.id, confirmedSale);
          success = true;
        }
      } else if (entry.type === 'expense' && entry.expense) {
        const confirmedExpense = await pushExpense(entry.expense);
        if (confirmedExpense) {
          success = true;
        }
      }

      if (success) {
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

export async function submitSale(sale: Sale): Promise<void> {
  await enqueueSale(sale);
  await notifyListeners();
  flushQueue().catch(console.error);
}

export async function submitExpense(expense: Expense): Promise<void> {
  await enqueueExpense(expense);
  await notifyListeners();
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
