import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { User } from '../../src/types';

const SELECT_COLUMNS = `
  id, name, pin, role, color, status, protected,
  branch_ids as "branchIds", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const users = await query<User>(`select ${SELECT_COLUMNS} from staff order by created_at asc`);
    res.status(200).json(users);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<User>(req);
    try {
      const rows = await query<User>(
        `insert into staff (id, name, pin, role, color, branch_ids)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name, pin = excluded.pin, role = excluded.role,
           color = excluded.color, branch_ids = excluded.branch_ids, updated_at = now()
         returning ${SELECT_COLUMNS}`,
        [body.id, body.name, body.pin, body.role, body.color, JSON.stringify(body.branchIds ?? [])],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (isUniquePinViolation(err)) {
        res.status(409).json({ error: 'Ese PIN ya está en uso por otro miembro del personal.' });
        return;
      }
      throw err;
    }
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

/** code 23505 = unique_violation en Postgres — acá solo puede venir del índice único del PIN. */
function isUniquePinViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505';
}

export default withErrorHandling(handler);
