import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { CashRegisterSession } from '../../src/types';

const SELECT_COLUMNS = `
  id, cashier_id as "cashierId", cashier_name as "cashierName", branch_id as "branchId",
  opened_at as "openedAt", closed_at as "closedAt", opening_amount as "openingAmount",
  closing_amount_counted as "closingAmountCounted", expected_amount as "expectedAmount",
  difference, sales_total as "salesTotal", sales_count as "salesCount",
  cash_sales_total as "cashSalesTotal", qr_sales_total as "qrSalesTotal", status, notes
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const sessions = await query<CashRegisterSession>(
      `select ${SELECT_COLUMNS} from register_sessions order by opened_at desc`,
    );
    res.status(200).json(sessions);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<CashRegisterSession>(req);
    const rows = await query<CashRegisterSession>(
      `insert into register_sessions (id, cashier_id, cashier_name, branch_id, opening_amount, notes)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing
       returning ${SELECT_COLUMNS}`,
      [body.id, body.cashierId, body.cashierName, body.branchId, body.openingAmount ?? 0, body.notes ?? null],
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
