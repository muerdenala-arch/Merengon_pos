import express from 'express';
import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Importar handlers de la API ──────────────────────────────────────────────
import branchesHandler from './branches.js';
import catalogHandler from './catalog.js'; // products + toppings + categories
import staffHandler from './staff.js';
import sessionsHandler from './sessions.js'; // register-sessions + qr-codes
import salesHandler from './sales.js';
import uploadHandler from './upload.js';
import operationsHandler from './operations.js'; // expenses + stock_movements + settings
import promotionsHandler from './promotions.js';
import couponsHandler from './coupons.js';
import cronCloseRegistersHandler from './cron-close-registers.js';

// Express req/res son compatibles con Vercel req/res para nuestros handlers
function adapt(handler: (req: VercelRequest, res: VercelResponse) => unknown) {
  return (req: Request, res: Response) =>
    handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
}

const app = express();

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas de la API ──────────────────────────────────────────────────────────
app.all('/api/branches', adapt(branchesHandler));
app.all('/api/branches/*', adapt(branchesHandler));
app.all('/api/products', adapt(catalogHandler));
app.all('/api/products/*', adapt(catalogHandler));
app.all('/api/toppings', adapt(catalogHandler));
app.all('/api/toppings/*', adapt(catalogHandler));
app.all('/api/categories', adapt(catalogHandler));
app.all('/api/categories/*', adapt(catalogHandler));
app.all('/api/staff', adapt(staffHandler));
app.all('/api/staff/*', adapt(staffHandler));
app.all('/api/register-sessions', adapt(sessionsHandler));
app.all('/api/register-sessions/*', adapt(sessionsHandler));
app.all('/api/qr-codes', adapt(sessionsHandler));
app.all('/api/qr-codes/*', adapt(sessionsHandler));
app.all('/api/sales', adapt(salesHandler));
app.all('/api/sales/*', adapt(salesHandler));
app.all('/api/upload', adapt(uploadHandler));
app.all('/api/expenses', adapt(operationsHandler));
app.all('/api/stock_movements', adapt(operationsHandler));
app.all('/api/stock_movements/*', adapt(operationsHandler));
app.all('/api/settings', adapt(operationsHandler));
app.all('/api/settings/*', adapt(operationsHandler));
app.all('/api/promotions', adapt(promotionsHandler));
app.all('/api/promotions/*', adapt(promotionsHandler));
app.all('/api/coupons', adapt(couponsHandler));
app.all('/api/coupons/*', adapt(couponsHandler));
app.all('/api/cron-close-registers', adapt(cronCloseRegistersHandler));

export default app;
