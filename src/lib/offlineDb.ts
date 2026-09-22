/**
 * offlineDb.ts
 * Capa de persistencia local usando IndexedDB (via idb).
 * Guarda ventas en una cola "pendingQueue" cuando no hay conexión o la red falla.
 * El SyncManager consume esta cola para enviarlas a Neon cuando haya internet.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { Sale, Expense } from '@/types';

const DB_NAME = 'merengon-pos';
const DB_VERSION = 1;
const STORE_NAME = 'pendingQueue';

export interface SessionOpenPayload {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openingAmount: number;
  notes?: string;
}

export interface SessionClosePayload {
  id: string;
  closingAmountCounted: number;
  expectedAmount: number;
  salesTotal: number;
  salesCount: number;
  cashSalesTotal: number;
  qrSalesTotal: number;
  notes?: string;
}

export interface PendingEntry {
  /** Mismo que sale.id / expense.id / sessionOpen.id / sessionClose.id — se usa como keyPath.
   *  Para 'session-close' se prefija para no chocar con la entrada 'session-open' de la
   *  misma sesión (comparten el mismo id de sesión). */
  id: string;
  type: 'sale' | 'expense' | 'session-open' | 'session-close';
  sale?: Sale;
  expense?: Expense;
  sessionOpen?: SessionOpenPayload;
  sessionClose?: SessionClosePayload;
  /** Fecha en que se encoló, para ordenar y detectar entradas muy antiguas */
  enqueuedAt: string;
  /** Número de intentos fallidos de sync */
  retryCount: number;
  /** Última vez que se intentó sincronizar esta entrada (ISO) — para espaciar reintentos y
   *  no quemar el contador de una entrada en problemas con cada nueva venta del cajero. */
  lastAttemptAt?: string;
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return _db;
}

/** Persiste una venta en la cola local. Idempotente: si ya existe, no duplica. */
export async function enqueueSale(sale: Sale): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get(STORE_NAME, sale.id);
    if (existing) return; // ya está en cola, no duplicar
    const entry: PendingEntry = {
      id: sale.id,
      type: 'sale',
      sale,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar venta:', err);
  }
}

/** Persiste un gasto en la cola local. */
export async function enqueueExpense(expense: Expense): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get(STORE_NAME, expense.id);
    if (existing) return;
    const entry: PendingEntry = {
      id: expense.id,
      type: 'expense',
      expense,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar gasto:', err);
  }
}

/** Persiste una apertura de caja en la cola local. CRÍTICO: si esto no se sincroniza antes
 *  de que se intenten sincronizar las ventas de esa sesión, esas ventas fallan para siempre
 *  (la sesión no existe en el servidor) — por eso apertura/cierre pasan por la MISMA cola
 *  ordenada por fecha que las ventas, en vez de un fetch aparte sin reintento. */
export async function enqueueSessionOpen(payload: SessionOpenPayload): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get(STORE_NAME, payload.id);
    if (existing) return;
    const entry: PendingEntry = {
      id: payload.id,
      type: 'session-open',
      sessionOpen: payload,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar apertura de caja:', err);
  }
}

/** Persiste un cierre de caja en la cola local. */
export async function enqueueSessionClose(payload: SessionClosePayload): Promise<void> {
  try {
    const db = await getDb();
    const queueId = `close_${payload.id}`;
    const existing = await db.get(STORE_NAME, queueId);
    if (existing) return;
    const entry: PendingEntry = {
      id: queueId,
      type: 'session-close',
      sessionClose: payload,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar cierre de caja:', err);
  }
}

/** Devuelve todas las ventas y gastos pendientes de sincronizar, ordenados por fecha. */
export async function getPendingQueue(): Promise<PendingEntry[]> {
  try {
    const db = await getDb();
    const all = await db.getAll(STORE_NAME) as PendingEntry[];
    return all.sort(
      (a, b) => new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime()
    );
  } catch (err) {
    console.error('[OfflineDB] Error al leer cola pendiente:', err);
    return [];
  }
}

/** Elimina una entrada de la cola tras sincronización exitosa con Neon. */
export async function removePendingEntry(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error('[OfflineDB] Error al eliminar entrada:', err);
  }
}

/** Incrementa el contador de reintentos fallidos para una entrada. */
export async function incrementRetry(id: string): Promise<void> {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, id) as PendingEntry | undefined;
    if (!entry) return;
    entry.retryCount += 1;
    entry.lastAttemptAt = new Date().toISOString();
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al actualizar reintento:', err);
  }
}

/** Devuelve cuántas ventas hay en la cola. 0 = todo sincronizado. */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count(STORE_NAME);
  } catch {
    return 0;
  }
}
