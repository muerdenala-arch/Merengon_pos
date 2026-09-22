import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAdmin, signToken } from './_lib/auth.js';
import type { User } from '../src/types/index.js';

// El PIN NUNCA viaja en esta lista — solo se lee server-side dentro del login (más abajo).
// Antes se mandaba en texto plano a CUALQUIERA que pidiera /api/staff, incluso antes de
// iniciar sesión (la app lo necesitaba para comparar el PIN en el navegador).
const SELECT_COLUMNS = `
  id, name, role, color, status, protected,
  branch_ids as "branchIds", created_at as "createdAt",
  requires_payment_photo as "requiresPaymentPhoto"
`;

// Intentos de login fallidos por IP en memoria (best-effort: se reinicia en cada cold
// start de la función serverless, pero frena un ataque automatizado sostenido).
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 5 * 60_000;
const LOGIN_MAX_ATTEMPTS = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;

  // POST /api/staff?action=login — el PIN se valida ACÁ, en el servidor, y nunca más se
  // manda la lista completa de PINs al navegador. Pública a propósito (es el login).
  if (req.method === 'POST' && action === 'login') {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
      return;
    }
    const body = requireBody<{ pin?: string }>(req);
    if (!body.pin || typeof body.pin !== 'string') {
      res.status(400).json({ error: 'PIN requerido.' });
      return;
    }
    const user = await queryOne<User & { pin: string }>(
      `select id, name, pin, role, color, status, protected, branch_ids as "branchIds", created_at as "createdAt",
         requires_payment_photo as "requiresPaymentPhoto"
       from staff where pin = $1 and status = 'activo'`,
      [body.pin],
    );
    if (!user) {
      res.status(401).json({ error: 'PIN incorrecto.' });
      return;
    }
    const { pin: _pin, ...safeUser } = user;
    void _pin;
    const token = signToken({ sub: safeUser.id, role: safeUser.role }, 60 * 60 * 24); // 24h
    res.status(200).json({ user: safeUser, token });
    return;
  }

  if (req.method === 'GET' && !id) {
    const users = await query<User>(`select ${SELECT_COLUMNS} from staff order by created_at asc`);
    res.status(200).json(users);
    return;
  }

  // Todo lo que crea/modifica/borra personal requiere sesión de administrador — antes
  // cualquiera con la URL podía hacer un POST/PATCH/DELETE directo sin pasar por la app.
  if (!requireAdmin(req, res)) return;

  if (req.method === 'POST' && !id) {
    const body = requireBody<User>(req);
    try {
      const rows = await query<User>(
        `insert into staff (id, name, pin, role, color, branch_ids, requires_payment_photo)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set
           name = excluded.name, pin = excluded.pin, role = excluded.role,
           color = excluded.color, branch_ids = excluded.branch_ids,
           requires_payment_photo = excluded.requires_payment_photo, updated_at = now()
         returning ${SELECT_COLUMNS}`,
        [body.id, body.name, body.pin, body.role, body.color, JSON.stringify(body.branchIds ?? []),
         body.requiresPaymentPhoto ?? true],
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

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<User>>(req);
    try {
      const user = await queryOne<User>(
        `update staff set
           name = coalesce($2, name),
           pin = coalesce($3, pin),
           role = coalesce($4, role),
           color = coalesce($5, color),
           status = coalesce($6, status),
           branch_ids = coalesce($7, branch_ids),
           requires_payment_photo = coalesce($8, requires_payment_photo),
           updated_at = now()
         where id = $1
         returning ${SELECT_COLUMNS}`,
        [
          id,
          body.name ?? null,
          body.pin ?? null,
          body.role ?? null,
          body.color ?? null,
          body.status ?? null,
          body.branchIds ? JSON.stringify(body.branchIds) : null,
          body.requiresPaymentPhoto ?? null,
        ],
      );
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      res.status(200).json(user);
    } catch (err) {
      if (isUniquePinViolation(err)) {
        res.status(409).json({ error: 'Ese PIN ya está en uso por otro miembro del personal.' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'DELETE' && id) {
    // Si tiene gastos registrados, `expenses.user_id REFERENCES staff` bloquearía el DELETE
    // con un error de FK sin manejar — se revisa antes para dar un mensaje claro en vez de
    // un 500 crudo (y de que la UI optimista lo muestre como eliminado sin estarlo).
    const [{ count }] = await query<{ count: string }>(
      'SELECT count(*)::text AS count FROM expenses WHERE user_id = $1', [id],
    );
    if (Number(count) > 0) {
      res.status(409).json({
        error: 'No se puede eliminar: este usuario tiene gastos registrados. Bloquéalo en su lugar para conservar el historial.',
      });
      return;
    }
    // El administrador principal (protected = true) nunca se puede eliminar, ni aunque
    // el pedido venga con su id — esta regla se aplica también acá, no solo en la UI.
    await query('delete from staff where id = $1 and protected = false', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

function isUniquePinViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505';
}

export default withErrorHandling(handler);
