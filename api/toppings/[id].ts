import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { Topping } from '../../src/types';

const SELECT_COLUMNS = `
  id, name, price_extra as "priceExtra", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    const body = requireBody<Partial<Topping>>(req);
    const topping = await queryOne<Topping>(
      `update toppings set
         name = coalesce($2, name),
         price_extra = coalesce($3, price_extra),
         stock_by_branch = coalesce($4, stock_by_branch),
         low_stock_threshold = coalesce($5, low_stock_threshold),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.name ?? null,
        body.priceExtra ?? null,
        body.stockByBranch ? JSON.stringify(body.stockByBranch) : null,
        body.lowStockThreshold ?? null,
      ],
    );
    if (!topping) {
      res.status(404).json({ error: 'Topping no encontrado' });
      return;
    }
    res.status(200).json(topping);
    return;
  }

  methodNotAllowed(res, ['PATCH']);
}

export default withErrorHandling(handler);
