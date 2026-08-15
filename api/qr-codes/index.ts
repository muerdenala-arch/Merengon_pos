import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { QrCode } from '../../src/types';

const SELECT_COLUMNS = `
  id, alias, bank_or_holder as "bankOrHolder", image_url as "image", active,
  branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const qrCodes = await query<QrCode>(`select ${SELECT_COLUMNS} from qr_codes order by created_at desc`);
    res.status(200).json(qrCodes);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<QrCode>(req);
    // El primer QR que se sube a una sucursal queda activo automáticamente ahí — se
    // decide acá mismo en la base para que sea correcto sin importar desde qué
    // dispositivo se suba.
    const [{ count }] = await query<{ count: string }>(
      'select count(*)::text as count from qr_codes where branch_id = $1 and active = true',
      [body.branchId],
    );
    const active = Number(count) === 0;

    const rows = await query<QrCode>(
      `insert into qr_codes (id, alias, bank_or_holder, image_url, active, branch_id)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         alias = excluded.alias, bank_or_holder = excluded.bank_or_holder,
         image_url = excluded.image_url, branch_id = excluded.branch_id
       returning ${SELECT_COLUMNS}`,
      [body.id, body.alias, body.bankOrHolder ?? '', body.image, active, body.branchId],
    );
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
