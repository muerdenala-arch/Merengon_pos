import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne, query } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Topping } from '../src/types';

const SELECT_COLUMNS = `
  id, name, price_extra as "priceExtra", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const toppings = await query<Topping>(`select ${SELECT_COLUMNS} from toppings order by name asc`);
    res.status(200).json(toppings);
    return;
  }

  if (req.method === 'PATCH' && id) {
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

  methodNotAllowed(res, ['GET', 'PATCH']);
}

export default withErrorHandling(handler);
