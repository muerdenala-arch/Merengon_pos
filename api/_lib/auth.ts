/**
 * api/_lib/auth.ts — sesión firmada (HMAC), sin tabla de sesiones en la DB.
 *
 * El login (`POST /api/staff?action=login`) valida el PIN en el SERVIDOR y devuelve un
 * token firmado; el navegador nunca vuelve a recibir la lista de PINs. Las rutas que
 * mutan datos (crear/editar/borrar personal, sucursales, catálogo, etc.) exigen este
 * token vía `Authorization: Bearer <token>` y verifican el rol — antes cualquiera con la
 * URL podía llamar la API directo (sin pasar por la app) y crear un admin, borrar
 * personal o alterar ventas.
 *
 * Las rutas de LECTURA usadas para hidratar la app ANTES del login (catálogo, sucursales,
 * ventas recientes, etc. — ver src/hooks/useDataSync.ts) siguen siendo públicas a propósito:
 * exigirles token rompería la pantalla de login (se queda cargando para siempre esperando
 * datos que nunca llegan sin sesión). Ese es un límite conocido, no un descuido — ver
 * auditoría para el detalle.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';

export interface AuthPayload {
  sub: string; // staff.id
  role: 'admin' | 'cajero';
  exp: number; // epoch seconds
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'Falta la variable de entorno SESSION_SECRET (necesaria para firmar sesiones de login).',
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(payload: Omit<AuthPayload, 'exp'>, expiresInSeconds: number): string {
  const full: AuthPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const body = base64url(JSON.stringify(full));
  const sig = base64url(createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): AuthPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const expectedSig = base64url(createHmac('sha256', getSecret()).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || Array.isArray(header)) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Devuelve el usuario autenticado (cualquier rol) o responde 401 y devuelve null. */
export function requireAuth(req: VercelRequest, res: VercelResponse): AuthPayload | null {
  const payload = verifyToken(extractToken(req));
  if (!payload) {
    res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
    return null;
  }
  return payload;
}

/** Igual que requireAuth, pero además exige rol 'admin'. */
export function requireAdmin(req: VercelRequest, res: VercelResponse): AuthPayload | null {
  const payload = requireAuth(req, res);
  if (!payload) return null;
  if (payload.role !== 'admin') {
    res.status(403).json({ error: 'Esta acción requiere permisos de administrador.' });
    return null;
  }
  return payload;
}
