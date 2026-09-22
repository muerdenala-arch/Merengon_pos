import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';

interface StockMovement {
  id: string;
  productId: string;
  branchId: string;
  quantityChange: number;
  type: 'SALE' | 'MANUAL_ADJUSTMENT' | 'RESTOCK';
  notes?: string;
  userId: string;
  createdAt?: string;
}

const SELECT_COLUMNS = `
  id, product_id as "productId", branch_id as "branchId",
  quantity_change as "quantityChange", type, notes,
  user_id as "userId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { branchId, productId, limit = '100' } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: string[] = [];
    
    if (branchId) {
      params.push(branchId as string);
      whereClause += ` AND branch_id = $${params.length}`;
    }
    
    if (productId) {
      params.push(productId as string);
      whereClause += ` AND product_id = $${params.length}`;
    }

    params.push(limit as string);
    const limitQuery = `LIMIT $${params.length}`;

    const movements = await query<StockMovement>(
      `SELECT ${SELECT_COLUMNS} FROM stock_movements ${whereClause} ORDER BY created_at DESC ${limitQuery}`,
      params
    );
    res.status(200).json(movements);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<StockMovement>(req);
    const rows = await query<StockMovement>(
      `INSERT INTO stock_movements (id, product_id, branch_id, quantity_change, type, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${SELECT_COLUMNS}`,
      [
        body.id,
        body.productId,
        body.branchId,
        body.quantityChange,
        body.type,
        body.notes ?? null,
        body.userId,
      ]
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
