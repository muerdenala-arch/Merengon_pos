import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { Product } from '../../src/types';

const SELECT_COLUMNS = `
  id, name, category, description, base_price as "basePrice", gradient, emoji, sizes,
  base_liquida_options as "baseLiquidaOptions", allow_sugar_level as "allowSugarLevel",
  topping_ids as "toppingIds", active, stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold", unit
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    const body = requireBody<Partial<Product>>(req);
    const product = await queryOne<Product>(
      `update products set
         name = coalesce($2, name),
         category = coalesce($3, category),
         description = coalesce($4, description),
         base_price = coalesce($5, base_price),
         gradient = coalesce($6, gradient),
         emoji = coalesce($7, emoji),
         sizes = coalesce($8, sizes),
         base_liquida_options = coalesce($9, base_liquida_options),
         allow_sugar_level = coalesce($10, allow_sugar_level),
         topping_ids = coalesce($11, topping_ids),
         active = coalesce($12, active),
         stock_by_branch = coalesce($13, stock_by_branch),
         low_stock_threshold = coalesce($14, low_stock_threshold),
         unit = coalesce($15, unit),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.name ?? null,
        body.category ?? null,
        body.description ?? null,
        body.basePrice ?? null,
        body.gradient ?? null,
        body.emoji ?? null,
        body.sizes ? JSON.stringify(body.sizes) : null,
        body.baseLiquidaOptions ? JSON.stringify(body.baseLiquidaOptions) : null,
        body.allowSugarLevel ?? null,
        body.toppingIds ? JSON.stringify(body.toppingIds) : null,
        body.active ?? null,
        body.stockByBranch ? JSON.stringify(body.stockByBranch) : null,
        body.lowStockThreshold ?? null,
        body.unit ?? null,
      ],
    );
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.status(200).json(product);
    return;
  }

  if (req.method === 'DELETE') {
    await query('delete from products where id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
