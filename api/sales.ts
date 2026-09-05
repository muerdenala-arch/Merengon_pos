import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Sale } from '../src/types';

const SELECT_COLUMNS = `
  id, ticket_number as "ticketNumber", items, subtotal,
  subtotal_before_discount as "subtotalBeforeDiscount",
  discount_amount as "discountAmount", discount_type as "discountType",
  coupon_code as "couponCode",
  total, payment,
  cashier_id as "cashierId", cashier_name as "cashierName",
  register_session_id as "registerSessionId", branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const sales = await query<Sale>(`select ${SELECT_COLUMNS} from sales order by created_at desc limit 500`);
    res.status(200).json(sales);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Omit<Sale, 'ticketNumber'>>(req);

    const rows = await withTransaction(async (tx) => {
      // Quemar el cupón atómicamente si fue utilizado en esta venta
      if (body.couponCode) {
        const coupons = await tx<{ id: string; used_count: number; max_uses: number }>(
          `SELECT id, used_count, max_uses FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true FOR UPDATE`,
          [body.couponCode]
        );
        const coupon = coupons[0];
        if (!coupon) {
          throw new Error('Cupón inválido o ya agotado.');
        }
        const newCount = coupon.used_count + 1;
        const willBeExhausted = newCount >= coupon.max_uses;
        await tx(
          `UPDATE coupons SET used_count = $2, is_active = $3, updated_at = NOW() WHERE id = $1`,
          [coupon.id, newCount, !willBeExhausted]
        );
      }

      return tx<Sale>(
        `INSERT INTO sales (
           id, items, subtotal, subtotal_before_discount, discount_amount, discount_type, coupon_code,
           total, payment, cashier_id, cashier_name, register_session_id, branch_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${SELECT_COLUMNS}`,
        [
          body.id,
          JSON.stringify(body.items),
          body.subtotal,
          body.subtotalBeforeDiscount ?? body.subtotal,
          body.discountAmount ?? 0,
          body.discountType ?? 'NONE',
          body.couponCode ?? null,
          body.total,
          JSON.stringify(body.payment),
          body.cashierId,
          body.cashierName,
          body.registerSessionId,
          body.branchId,
        ]
      );
    });

    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
