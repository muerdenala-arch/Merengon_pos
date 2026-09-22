/**
 * api/sessions.ts — Register Sessions + QR Codes (2 en 1 para el plan Hobby)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
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
  if (req.method === 'POST' && !id) {
    const body = requireBody<CashRegisterSession>(req);
    const rows = await query<CashRegisterSession>(
      `insert into register_sessions (id, cashier_id, cashier_name, branch_id, opening_amount, notes)
       values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing returning ${SESSION_COLS}`,
      [body.id, body.cashierId, body.cashierName, body.branchId, body.openingAmount ?? 0, body.notes ?? null],
    );
    res.status(201).json(rows[0]); return;
  }
  if (req.method === 'PATCH' && id) {
    const body = requireBody<{
      closingAmountCounted: number; expectedAmount: number; salesTotal: number;
      salesCount: number; cashSalesTotal: number; qrSalesTotal: number; notes?: string;
    }>(req);
    const difference = body.closingAmountCounted - body.expectedAmount;
    const session = await queryOne<CashRegisterSession>(
      `update register_sessions set status='cerrada', closed_at=now(),
         closing_amount_counted=$2, expected_amount=$3, difference=$4,
         sales_total=$5, sales_count=$6, cash_sales_total=$7, qr_sales_total=$8,
         notes=coalesce($9, notes)
       where id=$1 returning ${SESSION_COLS}`,
      [id, body.closingAmountCounted, body.expectedAmount, difference,
       body.salesTotal, body.salesCount, body.cashSalesTotal, body.qrSalesTotal, body.notes ?? null],
    );
    if (!session) { res.status(404).json({ error: 'Sesión de caja no encontrada' }); return; }
    res.status(200).json(session); return;
  }
  methodNotAllowed(res, ['GET','POST','PATCH']);
}

// ── QR Codes ──────────────────────────────────────────────────────────────────
const QR_COLS = `
  id, alias, bank_or_holder as "bankOrHolder", image_url as "image", active,
  branch_id as "branchId", created_at as "createdAt"
`;

async function qrCodesHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const qrCodes = await query<QrCode>(`select ${QR_COLS} from qr_codes order by created_at desc`);
    res.status(200).json(qrCodes); return;
  }
  if (req.method === 'POST' && !id) {
    const body = requireBody<QrCode>(req);
    const [{ count }] = await query<{ count: string }>(
      'select count(*)::text as count from qr_codes where branch_id = $1 and active = true',
      [body.branchId],
    );
    const active = Number(count) === 0;
    const rows = await query<QrCode>(
      `insert into qr_codes (id, alias, bank_or_holder, image_url, active, branch_id)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set alias=excluded.alias, bank_or_holder=excluded.bank_or_holder,
         image_url=excluded.image_url, branch_id=excluded.branch_id
       returning ${QR_COLS}`,
      [body.id, body.alias, body.bankOrHolder ?? '', body.image, active, body.branchId],
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
         image_url=coalesce($4,image_url), branch_id=coalesce($5,branch_id)
       where id=$1 returning ${QR_COLS}`,
      [id, body.alias ?? null, body.bankOrHolder ?? null, body.image ?? null, body.branchId ?? null],
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
