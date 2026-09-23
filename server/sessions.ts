/**
 * api/sessions.ts — Register Sessions + QR Codes (2 en 1 para el plan Hobby)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAuth, requireAdmin } from './_lib/auth.js';
import type { CashRegisterSession, QrCode } from '../src/types/index.js';

// ── Register Sessions ─────────────────────────────────────────────────────────
const SESSION_COLS = `
  id, cashier_id as "cashierId", cashier_name as "cashierName", branch_id as "branchId",
  opened_at as "openedAt", closed_at as "closedAt", opening_amount as "openingAmount",
  closing_amount_counted as "closingAmountCounted", expected_amount as "expectedAmount",
  difference, sales_total as "salesTotal", sales_count as "salesCount",
  cash_sales_total as "cashSalesTotal", qr_sales_total as "qrSalesTotal", status, notes
`;

async function registerSessionsHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const sessions = await query<CashRegisterSession>(
      `select ${SESSION_COLS} from register_sessions order by opened_at desc limit 500`,
    );
    res.status(200).json(sessions); return;
  }
  if (req.method !== 'GET' && !requireAuth(req, res)) return;

  if (req.method === 'POST' && !id) {
    const body = requireBody<CashRegisterSession>(req);
    // Idempotencia: si el id ya existe (reintento de la cola offline tras un timeout de
    // red tras un INSERT que sí llegó a commitear), devolver la existente con 409 en vez de
    // "insert on conflict do nothing" — eso devolvía 0 filas y el cliente recibía `undefined`.
    const existing = await query<CashRegisterSession>(
      `select ${SESSION_COLS} from register_sessions where id = $1`, [body.id],
    );
    if (existing.length > 0) { res.status(409).json(existing[0]); return; }
    const rows = await query<CashRegisterSession>(
      `insert into register_sessions (id, cashier_id, cashier_name, branch_id, opening_amount, notes)
       values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing returning ${SESSION_COLS}`,
      [body.id, body.cashierId, body.cashierName, body.branchId, body.openingAmount ?? 0, body.notes ?? null],
    );
    res.status(201).json(rows[0]); return;
  }
  // Cierre FORZADO por un admin de una caja que dejó otro cajero (ej. se olvidó, o el
  // bloqueo de "no se puede abrir una caja nueva mientras quede una sin cerrar" lo exige).
  // A diferencia del cierre normal (el propio cajero, con los totales que YA calculó su
  // propia pantalla), acá el admin nunca vio las ventas de ese turno, así que los montos se
  // calculan DIRECTO en la base de datos en vez de confiar en algo que el cliente mandó —
  // además evita el problema de que el store de ventas del navegador solo trae los últimos
  // 5 días (ver api/sales.ts), que sería insuficiente si la caja lleva más que eso abierta.
  if (req.method === 'PATCH' && id && req.query.action === 'adminClose') {
    if (!requireAdmin(req, res)) return;
    const body = requireBody<{ closingAmountCounted: number; notes?: string }>(req);

    const session = await queryOne<CashRegisterSession>(
      `select ${SESSION_COLS} from register_sessions where id = $1`, [id],
    );
    if (!session) { res.status(404).json({ error: 'Sesión de caja no encontrada' }); return; }
    if (session.status !== 'abierta') { res.status(200).json(session); return; } // idempotente

    const [salesAgg] = await query<{
      salesTotal: number; salesCount: number; cashSalesTotal: number; qrSalesTotal: number;
    }>(
      `SELECT
         COALESCE(SUM(total), 0) as "salesTotal",
         COUNT(*)::int as "salesCount",
         COALESCE(SUM(CASE WHEN payment->>'method' = 'efectivo' THEN total
                            WHEN payment->>'method' = 'mixto' THEN COALESCE((payment->>'amountEfectivo')::numeric, 0)
                            ELSE 0 END), 0) as "cashSalesTotal",
         COALESCE(SUM(CASE WHEN payment->>'method' = 'qr' THEN total
                            WHEN payment->>'method' = 'mixto' THEN COALESCE((payment->>'amountQr')::numeric, 0)
                            ELSE 0 END), 0) as "qrSalesTotal"
       FROM sales WHERE register_session_id = $1`,
      [id],
    );
    const [expensesAgg] = await query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE cash_register_id = $1`,
      [id],
    );

    const expectedAmount = Number(session.openingAmount) + Number(salesAgg.cashSalesTotal) - Number(expensesAgg.total);
    const difference = body.closingAmountCounted - expectedAmount;

    const closed = await queryOne<CashRegisterSession>(
      `update register_sessions set status='cerrada', closed_at=now(),
         closing_amount_counted=$2, expected_amount=$3, difference=$4,
         sales_total=$5, sales_count=$6, cash_sales_total=$7, qr_sales_total=$8,
         notes=coalesce($9, notes)
       where id=$1 and status='abierta' returning ${SESSION_COLS}`,
      [id, body.closingAmountCounted, expectedAmount, difference,
       salesAgg.salesTotal, salesAgg.salesCount, salesAgg.cashSalesTotal, salesAgg.qrSalesTotal,
       body.notes ?? null],
    );
    res.status(200).json(closed ?? session);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<{
      closingAmountCounted: number; expectedAmount: number; salesTotal: number;
      salesCount: number; cashSalesTotal: number; qrSalesTotal: number; notes?: string;
    }>(req);
    const difference = body.closingAmountCounted - body.expectedAmount;
    // WHERE status='abierta': un reintento (doble tap, red lenta, cola offline) de un cierre
    // YA aplicado no debe volver a escribir — eso sobreescribiría el arqueo original (montos
    // contados, diferencia) sin dejar rastro de que pasó. Si ya está cerrada, se devuelve tal
    // cual está (idempotente) en vez de un error o de un segundo cierre silencioso.
    const session = await queryOne<CashRegisterSession>(
      `update register_sessions set status='cerrada', closed_at=now(),
         closing_amount_counted=$2, expected_amount=$3, difference=$4,
         sales_total=$5, sales_count=$6, cash_sales_total=$7, qr_sales_total=$8,
         notes=coalesce($9, notes)
       where id=$1 and status='abierta' returning ${SESSION_COLS}`,
      [id, body.closingAmountCounted, body.expectedAmount, difference,
       body.salesTotal, body.salesCount, body.cashSalesTotal, body.qrSalesTotal, body.notes ?? null],
    );
    if (session) { res.status(200).json(session); return; }
    const alreadyClosed = await queryOne<CashRegisterSession>(
      `select ${SESSION_COLS} from register_sessions where id=$1`, [id],
    );
    if (!alreadyClosed) { res.status(404).json({ error: 'Sesión de caja no encontrada' }); return; }
    res.status(200).json(alreadyClosed); return;
  }
  methodNotAllowed(res, ['GET','POST','PATCH']);
}

// ── QR Codes ──────────────────────────────────────────────────────────────────
const QR_COLS = `
  id, alias, bank_or_holder as "bankOrHolder", image_url as "image", active,
  branch_id as "branchId", created_at as "createdAt", require_photo as "requirePhoto"
`;

async function qrCodesHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const qrCodes = await query<QrCode>(`select ${QR_COLS} from qr_codes order by created_at desc`);
    res.status(200).json(qrCodes); return;
  }
  if (req.method !== 'GET' && !requireAdmin(req, res)) return;

  if (req.method === 'POST' && !id) {
    const body = requireBody<QrCode>(req);
    const [{ count }] = await query<{ count: string }>(
      'select count(*)::text as count from qr_codes where branch_id = $1 and active = true',
      [body.branchId],
    );
    const active = Number(count) === 0;
    const rows = await query<QrCode>(
      `insert into qr_codes (id, alias, bank_or_holder, image_url, active, branch_id, require_photo)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set alias=excluded.alias, bank_or_holder=excluded.bank_or_holder,
         image_url=excluded.image_url, branch_id=excluded.branch_id, require_photo=excluded.require_photo
       returning ${QR_COLS}`,
      [body.id, body.alias, body.bankOrHolder ?? '', body.image, active, body.branchId, body.requirePhoto ?? true],
    );
    res.status(201).json(rows[0]); return;
  }
  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<QrCode> & { setActive?: boolean }>(req);
    if (body.setActive) {
      const qr = await withTransaction(async (tx) => {
        const current = await tx<QrCode>('select branch_id as "branchId" from qr_codes where id = $1', [id]);
        if (!current[0]) return null;
        await tx('update qr_codes set active = false where branch_id = $1', [current[0].branchId]);
        const updated = await tx<QrCode>(`update qr_codes set active = true where id = $1 returning ${QR_COLS}`, [id]);
        return updated[0] ?? null;
      });
      if (!qr) { res.status(404).json({ error: 'QR no encontrado' }); return; }
      res.status(200).json(qr); return;
    }
    const qr = await queryOne<QrCode>(
      `update qr_codes set alias=coalesce($2,alias), bank_or_holder=coalesce($3,bank_or_holder),
         image_url=coalesce($4,image_url), branch_id=coalesce($5,branch_id), require_photo=coalesce($6,require_photo)
       where id=$1 returning ${QR_COLS}`,
      [id, body.alias ?? null, body.bankOrHolder ?? null, body.image ?? null, body.branchId ?? null, body.requirePhoto ?? null],
    );
    if (!qr) { res.status(404).json({ error: 'QR no encontrado' }); return; }
    res.status(200).json(qr); return;
  }
  if (req.method === 'DELETE' && id) {
    await query('delete from qr_codes where id = $1', [id]);
    res.status(204).end(); return;
  }
  methodNotAllowed(res, ['GET','POST','PATCH','DELETE']);
}

// ── Router principal ──────────────────────────────────────────────────────────
async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url ?? '';
  if (url.includes('/api/register-sessions')) return registerSessionsHandler(req, res);
  if (url.includes('/api/qr-codes')) return qrCodesHandler(req, res);
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export default withErrorHandling(handler);
