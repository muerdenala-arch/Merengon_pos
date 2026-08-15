import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { Product } from '../../src/types';

const SELECT_COLUMNS = `
  id, name, category, description, base_price as "basePrice", gradient, emoji, sizes,
  base_liquida_options as "baseLiquidaOptions", allow_sugar_level as "allowSugarLevel",
  topping_ids as "toppingIds", active, stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold", unit
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const products = await query<Product>(`select ${SELECT_COLUMNS} from products order by name asc`);
    res.status(200).json(products);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Product>(req);
    const rows = await query<Product>(
      `insert into products (
         id, name, category, description, base_price, gradient, emoji, sizes,
         base_liquida_options, allow_sugar_level, topping_ids, active, stock_by_branch,
         low_stock_threshold, unit
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       on conflict (id) do update set
         name = excluded.name, category = excluded.category, description = excluded.description,
         base_price = excluded.base_price, gradient = excluded.gradient, emoji = excluded.emoji,
         sizes = excluded.sizes, base_liquida_options = excluded.base_liquida_options,
         allow_sugar_level = excluded.allow_sugar_level, topping_ids = excluded.topping_ids,
         active = excluded.active, stock_by_branch = excluded.stock_by_branch,
         low_stock_threshold = excluded.low_stock_threshold, unit = excluded.unit, updated_at = now()
       returning ${SELECT_COLUMNS}`,
      [
        body.id,
        body.name,
        body.category,
        body.description ?? '',
        body.basePrice ?? 0,
        body.gradient ?? '',
        body.emoji ?? '',
        JSON.stringify(body.sizes ?? []),
        JSON.stringify(body.baseLiquidaOptions ?? []),
        body.allowSugarLevel ?? true,
        JSON.stringify(body.toppingIds ?? []),
        body.active ?? true,
        JSON.stringify(body.stockByBranch ?? {}),
        body.lowStockThreshold ?? 0,
        body.unit ?? 'unidades',
      ],
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
