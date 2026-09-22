/**
 * server.ts — Servidor de desarrollo local para Fresas con Crema EL MERENGON
 *
 * Corre con: npx tsx --env-file=.env.local server.ts
 *
 * Emula las rutas serverless de Vercel con Express + Vite (como middleware con HMR).
 */

import { createServer as createViteServer } from 'vite';
import app from './server/app.js';

const PORT = 3333;

async function main() {
  // ── Vite como middleware (sirve el frontend con HMR) ─────────────────────────
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    // No escuchar en su propio puerto — usamos el de Express
  });

  app.use(vite.middlewares);

  // ── Lanzar servidor ──────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n  🍓 EL MERENGON POS — Servidor local listo`);
    console.log(`  ➜  http://localhost:${PORT}/\n`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
