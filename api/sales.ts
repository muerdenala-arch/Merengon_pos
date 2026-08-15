import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http';
import type { Sale } from '../src/types';

const SELECT_COLUMNS = `
  id, ticket_number as "ticketNumber", items, subtotal, total, payment,
  cashier_id as "cashierId", cashier_name as "cashierName",
  register_session_id as "registerSessionId", branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Recorte razonable para el panel admin/reportes — el historial completo de un
    // negocio real no necesita bajar entero en cada poll de 4s.
    const sales = await query<Sale>(`select ${SELECT_COLUMNS} from sales order by created_at desc limit 500`);
    res.status(200).json(sales);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Omit<Sale, 'ticketNumber'>>(req);
    // ticket_number usa nextval(ticket_number_seq) por defecto en la tabla: es atómico
    // entre todos los dispositivos, así nunca se repite un número aunque dos cajeros
    // cobren al mismo instante en sucursales distintas.
    const rows = await query<Sale>(
      `insert into sales (id, items, subtotal, total, payment, cashier_id, cashier_name, register_session_id, branch_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning ${SELECT_COLUMNS}`,
      [
        body.id,
        JSON.stringify(body.items),
        body.subtotal,
        body.total,
        JSON.stringify(body.payment),
        body.cashierId,
        body.cashierName,
        body.registerSessionId,
        body.branchId,
      ],
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
