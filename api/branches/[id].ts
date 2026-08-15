import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { Branch } from '../../src/types';

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    const body = requireBody<Partial<Branch>>(req);
    const branch = await queryOne<Branch>(
      `update branches set
         name = coalesce($2, name),
         address = coalesce($3, address),
         phone = coalesce($4, phone),
         active = coalesce($5, active),
         updated_at = now()
       where id = $1
       returning id, name, address, phone, active`,
      [id, body.name ?? null, body.address ?? null, body.phone ?? null, body.active ?? null],
    );
    if (!branch) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }
    res.status(200).json(branch);
    return;
  }

  methodNotAllowed(res, ['PATCH']);
}

export default withErrorHandling(handler);
