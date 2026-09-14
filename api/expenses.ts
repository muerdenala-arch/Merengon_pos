import { query } from './_lib/db.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const expenses = await query('SELECT * FROM expenses ORDER BY created_at DESC');
      
      // Mapear snake_case a camelCase para el frontend
      const mapped = expenses.map(e => ({
        id: e.id,
        amount: Number(e.amount),
        concept: e.concept,
        category: e.category,
        cashRegisterId: e.cash_register_id,
        branchId: e.branch_id,
        userId: e.user_id,
        createdAt: e.created_at,
      }));
      
      return res.status(200).json(mapped);
    }

    if (req.method === 'POST') {
      const { id, amount, concept, category, cashRegisterId, branchId, userId, createdAt } = req.body;
      
      if (!id || !amount || !concept || !category || !cashRegisterId || !branchId || !userId) {
        return res.status(400).json({ error: 'Faltan campos requeridos en el gasto.' });
      }

      await query(
        `INSERT INTO expenses (id, amount, concept, category, cash_register_id, branch_id, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [id, amount, concept, category, cashRegisterId, branchId, userId, createdAt || new Date().toISOString()]
      );

      return res.status(201).json(req.body);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Expenses API error:', err);
    return res.status(500).json({ error: 'Error interno del servidor al procesar gastos.' });
  }
}
