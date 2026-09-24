/**
 * api/operations.ts — Expenses + Stock Movements + Settings (3 en 1 para el plan Hobby)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAuth, requireAdmin } from './_lib/auth.js';
import type { Expense } from '../src/types/index.js';
import { SIZELESS_KEY } from '../src/types/index.js';

// ── Expenses ──────────────────────────────────────────────────────────────────
const EXPENSE_COLS = `
  id, amount, concept, category,
  cash_register_id as "cashRegisterId",
  branch_id as "branchId",
  user_id as "userId",
  created_at as "createdAt"
`;

async function expensesHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const expenses = await query<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses ORDER BY created_at DESC`);
    res.status(200).json(expenses); return;
  }
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const body = requireBody<Expense>(req);
    if (!body.id || !body.amount || !body.concept || !body.category || !body.userId) {
      res.status(400).json({ error: 'Faltan campos requeridos en el gasto.' }); return;
    }
    const existing = await query<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses WHERE id = $1`, [body.id]);
    if (existing.length > 0) { res.status(409).json(existing[0]); return; }
    const rows = await query<Expense>(
      `INSERT INTO expenses (id, amount, concept, category, cash_register_id, branch_id, user_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${EXPENSE_COLS}`,
      [body.id, body.amount, body.concept, body.category,
       body.cashRegisterId || null, body.branchId || null, body.userId,
       body.createdAt || new Date().toISOString()],
    );
    res.status(201).json(rows[0]); return;
  }
  methodNotAllowed(res, ['GET','POST']);
}

// ── Stock Movements ───────────────────────────────────────────────────────────
interface StockMovement {
  id: string; productId: string; branchId: string;
  quantityChange: number; type: 'SALE' | 'MANUAL_ADJUSTMENT' | 'RESTOCK';
  notes?: string; userId: string; createdAt?: string;
}

const MOVEMENT_COLS = `
  id, product_id as "productId", branch_id as "branchId",
  quantity_change as "quantityChange", type, notes,
  user_id as "userId", created_at as "createdAt"
`;

interface TransferBody {
  id: string; productId: string; fromBranchId: string; toBranchId: string;
  quantity: number; userId: string; notes?: string;
  /** Tamaño del producto que se transfiere — SIZELESS_KEY si no se indica (ej. insumos de
   *  bodega sin tamaños). Cada tamaño tiene su propio stock, así que la transferencia debe
   *  saber cuál mover. */
  sizeId?: string;
}

async function stockMovementsHandler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;

  if (req.method === 'GET') {
    const { branchId, productId, limit = '100' } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: string[] = [];
    if (branchId) { params.push(branchId as string); whereClause += ` AND branch_id = $${params.length}`; }
    if (productId) { params.push(productId as string); whereClause += ` AND product_id = $${params.length}`; }
    params.push(limit as string);
    const movements = await query<StockMovement>(
      `SELECT ${MOVEMENT_COLS} FROM stock_movements ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
    res.status(200).json(movements); return;
  }

  // POST /api/stock_movements?action=transfer — mueve stock de UNA sucursal a otra (ej.
  // retiro de bodega) en UNA sola transacción atómica: o se descuenta+acredita+registra
  // el kardex completo, o no pasa nada. Reemplaza el patrón anterior de 2 PATCH + 2 POST
  // independientes desde el cliente, donde un fallo de red a mitad de camino hacía
  // desaparecer stock (descontado de bodega, nunca acreditado a la sucursal).
  if (req.method === 'POST' && action === 'transfer') {
    if (!requireAuth(req, res)) return;
    const body = requireBody<TransferBody>(req);
    if (!body.id || !body.productId || !body.fromBranchId || !body.toBranchId || !body.userId || !(body.quantity > 0)) {
      res.status(400).json({ error: 'Faltan campos requeridos para la transferencia.' }); return;
    }
    const sizeId = body.sizeId ?? SIZELESS_KEY;
    try {
      const result = await withTransaction(async (tx) => {
        const existing = await tx<StockMovement>(
          `SELECT ${MOVEMENT_COLS} FROM stock_movements WHERE id = $1`, [`${body.id}_out`],
        );
        if (existing.length > 0) return { alreadyDone: true as const };

        const [product] = await tx<{ stockByBranch: Record<string, Record<string, number>> }>(
          `SELECT stock_by_branch as "stockByBranch" FROM products WHERE id = $1 FOR UPDATE`,
          [body.productId],
        );
        const available = product ? (product.stockByBranch[body.fromBranchId]?.[sizeId] ?? 0) : 0;
        if (available < body.quantity) {
          throw new Error(`Stock insuficiente en bodega: quedan ${available}.`);
        }

        await tx(
          `UPDATE products SET stock_by_branch = jsonb_set(
             coalesce(stock_by_branch,'{}'::jsonb), ARRAY[$2::text],
             jsonb_set(
               coalesce(stock_by_branch->$2::text, '{}'::jsonb), ARRAY[$4::text],
               to_jsonb(GREATEST(0, COALESCE((stock_by_branch->$2::text->>$4::text)::int,0) - $3::int)),
               true
             ),
             true
           ), updated_at = now() WHERE id = $1`,
          [body.productId, body.fromBranchId, body.quantity, sizeId],
        );
        await tx(
          `UPDATE products SET stock_by_branch = jsonb_set(
             coalesce(stock_by_branch,'{}'::jsonb), ARRAY[$2::text],
             jsonb_set(
               coalesce(stock_by_branch->$2::text, '{}'::jsonb), ARRAY[$4::text],
               to_jsonb(COALESCE((stock_by_branch->$2::text->>$4::text)::int,0) + $3::int),
               true
             ),
             true
           ), updated_at = now() WHERE id = $1`,
          [body.productId, body.toBranchId, body.quantity, sizeId],
        );
        await tx(
          `INSERT INTO stock_movements (id, product_id, branch_id, quantity_change, type, notes, user_id)
           VALUES ($1,$2,$3,$4,'MANUAL_ADJUSTMENT',$5,$6)`,
          [`${body.id}_out`, body.productId, body.fromBranchId, -body.quantity, body.notes ?? 'Retiro hacia sucursal', body.userId],
        );
        await tx(
          `INSERT INTO stock_movements (id, product_id, branch_id, quantity_change, type, notes, user_id)
           VALUES ($1,$2,$3,$4,'RESTOCK',$5,$6)`,
          [`${body.id}_in`, body.productId, body.toBranchId, body.quantity, body.notes ?? 'Ingreso desde bodega', body.userId],
        );
        const [updatedProduct] = await tx<{ stockByBranch: Record<string, Record<string, number>> }>(
          `SELECT stock_by_branch as "stockByBranch" FROM products WHERE id = $1`, [body.productId],
        );
        return { alreadyDone: false as const, stockByBranch: updatedProduct?.stockByBranch ?? {} };
      });
      res.status(200).json(result);
      return;
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'No se pudo completar la transferencia.' });
      return;
    }
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const body = requireBody<StockMovement>(req);
    const rows = await query<StockMovement>(
      `INSERT INTO stock_movements (id, product_id, branch_id, quantity_change, type, notes, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${MOVEMENT_COLS}`,
      [body.id, body.productId, body.branchId, body.quantityChange, body.type, body.notes ?? null, body.userId],
    );
    res.status(201).json(rows[0]); return;
  }
  methodNotAllowed(res, ['GET','POST']);
}

// ── Settings ──────────────────────────────────────────────────────────────────
interface Setting { key: string; value: unknown; }

async function settingsHandler(req: VercelRequest, res: VercelResponse) {
  const toObj = (rows: Setting[]) => rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {} as Record<string, unknown>);

  if (req.method === 'GET') {
    const rows = await query<Setting>('SELECT key, value FROM settings');
    res.status(200).json(toObj(rows)); return;
  }
  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const body = requireBody<Record<string, unknown>>(req);
    for (const [key, value] of Object.entries(body)) {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(value)],
      );
    }
    const rows = await query<Setting>('SELECT key, value FROM settings');
    res.status(200).json(toObj(rows)); return;
  }
  methodNotAllowed(res, ['GET','POST']);
}

// ── Router principal ──────────────────────────────────────────────────────────
async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url ?? '';
  if (url.includes('/api/expenses')) return expensesHandler(req, res);
  if (url.includes('/api/stock_movements')) return stockMovementsHandler(req, res);
  if (url.includes('/api/settings')) return settingsHandler(req, res);
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export default withErrorHandling(handler);
