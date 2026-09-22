/**
 * api/operations.ts — Expenses + Stock Movements + Settings (3 en 1 para el plan Hobby)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Expense } from '../src/types/index.js';

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

async function stockMovementsHandler(req: VercelRequest, res: VercelResponse) {
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
  if (req.method === 'POST') {
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
