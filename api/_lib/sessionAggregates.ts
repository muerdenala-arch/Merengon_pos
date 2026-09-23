import { query } from './db.js';

export interface SessionAggregates {
  salesTotal: number;
  salesCount: number;
  cashSalesTotal: number;
  qrSalesTotal: number;
  expensesTotal: number;
}

/** Calcula las ventas y gastos REALES de una sesión de caja directo desde la base de
 *  datos (nunca confiando en un total que mande el cliente) — usado tanto para el cierre
 *  forzado por admin como para el cierre automático de fin de día, donde quien cierra
 *  nunca vio ese turno y no hay nada que el navegador pueda aportar. */
export async function computeSessionAggregates(sessionId: string): Promise<SessionAggregates> {
  const [salesAgg] = await query<{
    salesTotal: number; salesCount: number; cashSalesTotal: number; qrSalesTotal: number;
  }>(
    `SELECT
       COALESCE(SUM(total), 0) as "salesTotal",
       COUNT(*)::int as "salesCount",
       COALESCE(SUM(CASE WHEN payment->>'method' = 'efectivo' THEN total
                          WHEN payment->>'method' = 'mixto' THEN COALESCE((payment->>'amountEfectivo')::numeric, 0)
                          ELSE 0 END), 0) as "cashSalesTotal",
       COALESCE(SUM(CASE WHEN payment->>'method' = 'qr' THEN total
                          WHEN payment->>'method' = 'mixto' THEN COALESCE((payment->>'amountQr')::numeric, 0)
                          ELSE 0 END), 0) as "qrSalesTotal"
     FROM sales WHERE register_session_id = $1`,
    [sessionId],
  );
  const [expensesAgg] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE cash_register_id = $1`,
    [sessionId],
  );
  return {
    salesTotal: Number(salesAgg.salesTotal),
    salesCount: Number(salesAgg.salesCount),
    cashSalesTotal: Number(salesAgg.cashSalesTotal),
    qrSalesTotal: Number(salesAgg.qrSalesTotal),
    expensesTotal: Number(expensesAgg.total),
  };
}
