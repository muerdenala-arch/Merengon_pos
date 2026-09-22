import express from 'express';
import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Importar handlers de la API ──────────────────────────────────────────────
import branchesHandler from './branches.js';
import productsHandler from './products.js';
import toppingsHandler from './toppings.js';
import categoriesHandler from './categories.js';
import staffHandler from './staff.js';
import qrCodesHandler from './qr-codes.js';
import registerSessionsHandler from './register-sessions.js';
import salesHandler from './sales.js';
import uploadHandler from './upload.js';
import promotionsHandler from './promotions.js';
import settingsHandler from './settings.js';
import stockMovementsHandler from './stock_movements.js';
import couponsHandler from './coupons.js';

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
app.all('/api/products', adapt(productsHandler));
app.all('/api/products/*', adapt(productsHandler));
app.all('/api/toppings', adapt(toppingsHandler));
app.all('/api/toppings/*', adapt(toppingsHandler));
app.all('/api/categories', adapt(categoriesHandler));
app.all('/api/categories/*', adapt(categoriesHandler));
app.all('/api/staff', adapt(staffHandler));
app.all('/api/staff/*', adapt(staffHandler));
app.all('/api/qr-codes', adapt(qrCodesHandler));
app.all('/api/qr-codes/*', adapt(qrCodesHandler));
app.all('/api/register-sessions', adapt(registerSessionsHandler));
app.all('/api/register-sessions/*', adapt(registerSessionsHandler));
app.all('/api/sales', adapt(salesHandler));
app.all('/api/sales/*', adapt(salesHandler));
app.all('/api/upload', adapt(uploadHandler));
app.all('/api/promotions', adapt(promotionsHandler));
app.all('/api/promotions/*', adapt(promotionsHandler));
app.all('/api/settings', adapt(settingsHandler));
app.all('/api/settings/*', adapt(settingsHandler));
app.all('/api/stock_movements', adapt(stockMovementsHandler));
app.all('/api/stock_movements/*', adapt(stockMovementsHandler));
app.all('/api/coupons', adapt(couponsHandler));
app.all('/api/coupons/*', adapt(couponsHandler));

export default app;
