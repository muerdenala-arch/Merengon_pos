import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { Branch } from '../../src/types';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const branches = await query<Branch>(
      'select id, name, address, phone, active from branches order by name asc',
    );
    res.status(200).json(branches);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Branch>(req);
    const rows = await query<Branch>(
      `insert into branches (id, name, address, phone, active)
       values ($1, $2, $3, $4, true)
       on conflict (id) do update set name = excluded.name, address = excluded.address, phone = excluded.phone
       returning id, name, address, phone, active`,
      [body.id, body.name, body.address ?? '', body.phone ?? ''],
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
