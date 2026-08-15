import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Branch } from '../src/types';

// Un solo archivo maneja la colección (/api/branches) y un ítem puntual
// (/api/branches?id=xxx) — el plan Hobby de Vercel limita a 12 funciones
// serverless por deployment, así que se fusiona index+[id] de cada recurso
// en vez de un archivo por ruta.
const SELECT_COLUMNS = 'id, name, address, phone, active';

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const branches = await query<Branch>(`select ${SELECT_COLUMNS} from branches order by name asc`);
    res.status(200).json(branches);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Branch>(req);
    const rows = await query<Branch>(
      `insert into branches (id, name, address, phone, active)
       values ($1, $2, $3, $4, true)
       on conflict (id) do update set name = excluded.name, address = excluded.address, phone = excluded.phone
       returning ${SELECT_COLUMNS}`,
      [body.id, body.name, body.address ?? '', body.phone ?? ''],
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Branch>>(req);
    const branch = await queryOne<Branch>(
      `update branches set
         name = coalesce($2, name),
         address = coalesce($3, address),
         phone = coalesce($4, phone),
         active = coalesce($5, active),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [id, body.name ?? null, body.address ?? null, body.phone ?? null, body.active ?? null],
    );
    if (!branch) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }
    res.status(200).json(branch);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
}

export default withErrorHandling(handler);
