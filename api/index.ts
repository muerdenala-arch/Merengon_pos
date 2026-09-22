import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/app.js';

// Vercel llama a este handler con (req, res).
// Express app implementa la misma interfaz, así que se puede usar directamente.
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express app tiene la misma firma que un handler de Vercel
  return app(req as any, res as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}
