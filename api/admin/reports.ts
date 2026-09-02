import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db.js';
import { methodNotAllowed, withErrorHandling } from '../_lib/http.js';
import type { Sale, CashRegisterSession } from '../../src/types/index.js';

const SELECT_SALES = `
  id, ticket_number as "ticketNumber", items, subtotal, total, payment,
  cashier_id as "cashierId", cashier_name as "cashierName",
  register_session_id as "registerSessionId", branch_id as "branchId", created_at as "createdAt"
`;

const SELECT_SESSIONS = `
  id, cashier_id as "cashierId", cashier_name as "cashierName", branch_id as "branchId",
  opened_at as "openedAt", closed_at as "closedAt", opening_amount as "openingAmount",
  closing_amount_counted as "closingAmountCounted", expected_amount as "expectedAmount",
  difference, sales_total as "salesTotal", sales_count as "salesCount",
  cash_sales_total as "cashSalesTotal", qr_sales_total as "qrSalesTotal", status, notes
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { startDate, endDate, branchId } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (end.getHours() === 0 && end.getMinutes() === 0) {
      end.setHours(23, 59, 59, 999);
    }

    const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

    const branchFilter = branchId && branchId !== 'all' ? `AND branch_id = $3` : '';
    const params: any[] = [start.toISOString(), end.toISOString()];
    if (branchId && branchId !== 'all') {
      params.push(branchId);
    }

    const sales = await query<Sale>(
      `SELECT ${SELECT_SALES} FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter} ORDER BY created_at DESC`,
      params
    );

    const sessions = await query<CashRegisterSession>(
      `SELECT ${SELECT_SESSIONS} FROM register_sessions WHERE opened_at >= $1 AND opened_at <= $2 ${branchFilter} ORDER BY opened_at DESC`,
      params
    );

    const monthlyParams: any[] = [startOfMonth.toISOString(), endOfMonth.toISOString()];
    if (branchId && branchId !== 'all') {
      monthlyParams.push(branchId);
    }
    const monthlyResult = await query<{ sum: number }>(
      `SELECT COALESCE(SUM(total), 0) as sum FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`,
      monthlyParams
    );
    const monthlyTotal = Number(monthlyResult[0]?.sum) || 0;

    res.status(200).json({
      sales,
      sessions,
      monthlyTotal
    });
    return;
  }

  methodNotAllowed(res, ['GET']);
}

export default withErrorHandling(handler);
