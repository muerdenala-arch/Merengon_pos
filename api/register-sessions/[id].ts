import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne } from '../_lib/db';
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
  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    // Único uso real: cerrar la caja. Se calcula la diferencia acá mismo con los valores
    // que llegan, igual que hacía el store local antes.
    const body = requireBody<{
      closingAmountCounted: number;
      expectedAmount: number;
      salesTotal: number;
      salesCount: number;
      cashSalesTotal: number;
      qrSalesTotal: number;
      notes?: string;
    }>(req);
    const difference = body.closingAmountCounted - body.expectedAmount;
    const session = await queryOne<CashRegisterSession>(
      `update register_sessions set
         status = 'cerrada',
         closed_at = now(),
         closing_amount_counted = $2,
         expected_amount = $3,
         difference = $4,
         sales_total = $5,
         sales_count = $6,
         cash_sales_total = $7,
         qr_sales_total = $8,
         notes = coalesce($9, notes)
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.closingAmountCounted,
        body.expectedAmount,
        difference,
        body.salesTotal,
        body.salesCount,
        body.cashSalesTotal,
        body.qrSalesTotal,
        body.notes ?? null,
      ],
    );
    if (!session) {
      res.status(404).json({ error: 'Sesión de caja no encontrada' });
      return;
    }
    res.status(200).json(session);
    return;
  }

  methodNotAllowed(res, ['PATCH']);
}

export default withErrorHandling(handler);
