/**
 * api/cron-close-registers.ts — cierre automático de fin de día.
 *
 * Pedido explícito: el administrador no tiene tiempo de estar entrando a cerrar la caja de
 * cada cajero que se olvidó — así que a la medianoche (hora Bolivia, ver vercel.json) el
 * sistema cierra SOLO cualquier caja que haya quedado abierta, sin esperar a que alguien la
 * cierre a mano.
 *
 * Como nadie cuenta el efectivo físicamente a esa hora, el cierre asume que el efectivo
 * contado coincide con el esperado (diferencia = 0) — a diferencia del cierre normal o del
 * cierre forzado por admin, que sí piden un conteo real. Por eso queda registrado en las
 * notas de la sesión como "cerrada automáticamente", para que quede claro en la auditoría
 * que ese arqueo no fue verificado por nadie.
 *
 * Vercel llama a esta ruta según el cron de vercel.json y manda
 * `Authorization: Bearer $CRON_SECRET` automáticamente — se verifica ese secreto para que
 * nadie más pueda disparar cierres masivos adivinando la URL.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { withErrorHandling } from './_lib/http.js';
import { computeSessionAggregates } from './_lib/sessionAggregates.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const openSessions = await query<{ id: string; openingAmount: number }>(
    `SELECT id, opening_amount as "openingAmount" FROM register_sessions WHERE status = 'abierta'`,
  );

  let closedCount = 0;
  for (const session of openSessions) {
    const agg = await computeSessionAggregates(session.id);
    const expectedAmount = Number(session.openingAmount) + agg.cashSalesTotal - agg.expensesTotal;

    // WHERE status='abierta': por si esta misma sesión ya se cerró (a mano o por otra
    // corrida) entre el SELECT de arriba y este UPDATE. RETURNING id para saber si de
    // verdad se actualizó algo.
    const updated = await query<{ id: string }>(
      `UPDATE register_sessions SET status = 'cerrada', closed_at = now(),
         closing_amount_counted = $2, expected_amount = $2, difference = 0,
         sales_total = $3, sales_count = $4, cash_sales_total = $5, qr_sales_total = $6,
         notes = CASE WHEN notes IS NULL OR notes = '' THEN $7
                      ELSE notes || ' · ' || $7 END
       WHERE id = $1 AND status = 'abierta'
       RETURNING id`,
      [
        session.id, expectedAmount, agg.salesTotal, agg.salesCount, agg.cashSalesTotal, agg.qrSalesTotal,
        'Cerrada automáticamente al finalizar el día (sin conteo físico).',
      ],
    );
    if (updated.length > 0) closedCount++;
  }

  res.status(200).json({ closed: closedCount, checked: openSessions.length });
}

export default withErrorHandling(handler);
