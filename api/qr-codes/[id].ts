import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from '../_lib/db';
import { methodNotAllowed, requireBody, withErrorHandling } from '../_lib/http';
import type { QrCode } from '../../src/types';

const SELECT_COLUMNS = `
  id, alias, bank_or_holder as "bankOrHolder", image_url as "image", active,
  branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (req.method === 'PATCH') {
    const body = requireBody<Partial<QrCode> & { setActive?: boolean }>(req);

    if (body.setActive) {
      // Solo un QR activo a la vez por sucursal: apaga todos los de esa sucursal y
      // prende únicamente este, en una sola transacción para no dejar un estado a medias.
      const qr = await withTransaction(async (tx) => {
        const current = await tx<QrCode>('select branch_id as "branchId" from qr_codes where id = $1', [id]);
        if (!current[0]) return null;
        await tx('update qr_codes set active = false where branch_id = $1', [current[0].branchId]);
        const updated = await tx<QrCode>(
          `update qr_codes set active = true where id = $1 returning ${SELECT_COLUMNS}`,
          [id],
        );
        return updated[0] ?? null;
      });
      if (!qr) {
        res.status(404).json({ error: 'QR no encontrado' });
        return;
      }
      res.status(200).json(qr);
      return;
    }

    const qr = await queryOne<QrCode>(
      `update qr_codes set
         alias = coalesce($2, alias),
         bank_or_holder = coalesce($3, bank_or_holder),
         image_url = coalesce($4, image_url),
         branch_id = coalesce($5, branch_id)
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [id, body.alias ?? null, body.bankOrHolder ?? null, body.image ?? null, body.branchId ?? null],
    );
    if (!qr) {
      res.status(404).json({ error: 'QR no encontrado' });
      return;
    }
    res.status(200).json(qr);
    return;
  }

  if (req.method === 'DELETE') {
    await query('delete from qr_codes where id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
