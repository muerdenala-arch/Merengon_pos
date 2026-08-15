import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, withErrorHandling } from '../_lib/http';
import type { Topping } from '../../src/types';

const SELECT_COLUMNS = `
  id, name, price_extra as "priceExtra", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const toppings = await query<Topping>(`select ${SELECT_COLUMNS} from toppings order by name asc`);
    res.status(200).json(toppings);
    return;
  }

  methodNotAllowed(res, ['GET']);
}

export default withErrorHandling(handler);
