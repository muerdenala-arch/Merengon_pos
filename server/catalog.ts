/**
 * api/catalog.ts — Productos, Toppings y Categorías (3 en 1 para el plan Hobby)
 * Enruta según el parámetro ?resource=products|toppings|categories
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Product, Topping, Category } from '../src/types/index.js';

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCT_COLS = `
  id, name, category, description, base_price as "basePrice", gradient, emoji, sizes,
  topping_ids as "toppingIds", branch_ids as "branchIds", active, stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold", unit
`;

async function productsHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const products = await query<Product>(`select ${PRODUCT_COLS} from products order by name asc`);
    res.status(200).json(products); return;
  }
  if (req.method === 'POST' && !id) {
    const body = requireBody<Product>(req);
    const rows = await query<Product>(
      `insert into products (id, name, category, description, base_price, gradient, emoji, sizes,
         topping_ids, branch_ids, active, stock_by_branch, low_stock_threshold, unit)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do update set
         name=excluded.name, category=excluded.category, description=excluded.description,
         base_price=excluded.base_price, gradient=excluded.gradient, emoji=excluded.emoji,
         sizes=excluded.sizes, topping_ids=excluded.topping_ids, branch_ids=excluded.branch_ids,
         active=excluded.active, stock_by_branch=excluded.stock_by_branch,
         low_stock_threshold=excluded.low_stock_threshold, unit=excluded.unit, updated_at=now()
       returning ${PRODUCT_COLS}`,
      [body.id,body.name,body.category,body.description??'',body.basePrice??0,
       body.gradient??'',body.emoji??'',JSON.stringify(body.sizes??[]),
       JSON.stringify(body.toppingIds??[]),JSON.stringify(body.branchIds??[]),
       body.active??true,JSON.stringify(body.stockByBranch??{}),
       body.lowStockThreshold??0,body.unit??'unidades'],
    );
    res.status(201).json(rows[0]); return;
  }
  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Product>>(req);
    const product = await queryOne<Product>(
      `update products set name=coalesce($2,name), category=coalesce($3,category),
         description=coalesce($4,description), base_price=coalesce($5,base_price),
         gradient=coalesce($6,gradient), emoji=coalesce($7,emoji), sizes=coalesce($8,sizes),
         topping_ids=coalesce($9,topping_ids), branch_ids=coalesce($10,branch_ids),
         active=coalesce($11,active), stock_by_branch=coalesce($12,stock_by_branch),
         low_stock_threshold=coalesce($13,low_stock_threshold), unit=coalesce($14,unit),
         updated_at=now()
       where id=$1 returning ${PRODUCT_COLS}`,
      [id,body.name??null,body.category??null,body.description??null,body.basePrice??null,
       body.gradient??null,body.emoji??null,body.sizes?JSON.stringify(body.sizes):null,
       body.toppingIds?JSON.stringify(body.toppingIds):null,body.branchIds?JSON.stringify(body.branchIds):null,
       body.active??null,body.stockByBranch?JSON.stringify(body.stockByBranch):null,
       body.lowStockThreshold??null,body.unit??null],
    );
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    res.status(200).json(product); return;
  }
  if (req.method === 'DELETE' && id) {
    await query('delete from products where id = $1', [id]);
    res.status(204).end(); return;
  }
  methodNotAllowed(res, ['GET','POST','PATCH','DELETE']);
}

// ── Toppings ──────────────────────────────────────────────────────────────────
const TOPPING_COLS = `
  id, name, price_extra as "priceExtra", branch_ids as "branchIds", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

async function toppingsHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const toppings = await query<Topping>(`select ${TOPPING_COLS} from toppings order by name asc`);
    res.status(200).json(toppings); return;
  }
  if (req.method === 'POST' && !id) {
    const body = requireBody<Topping>(req);
    const rows = await query<Topping>(
      `insert into toppings (id, name, price_extra, branch_ids, stock_by_branch, low_stock_threshold)
       values ($1,$2,$3,$4::jsonb,$5::jsonb,$6)
       on conflict (id) do update set
         name=excluded.name, price_extra=excluded.price_extra, branch_ids=excluded.branch_ids,
         stock_by_branch=excluded.stock_by_branch, low_stock_threshold=excluded.low_stock_threshold
       returning ${TOPPING_COLS}`,
      [body.id,body.name,body.priceExtra??0,JSON.stringify(body.branchIds??[]),
       JSON.stringify(body.stockByBranch??{}),body.lowStockThreshold??0],
    );
    res.status(201).json(rows[0]); return;
  }
  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Topping>>(req);
    const topping = await queryOne<Topping>(
      `update toppings set name=coalesce($2,name), price_extra=coalesce($3,price_extra),
         branch_ids=coalesce($4::jsonb,branch_ids), stock_by_branch=coalesce($5::jsonb,stock_by_branch),
         low_stock_threshold=coalesce($6,low_stock_threshold), updated_at=now()
       where id=$1 returning ${TOPPING_COLS}`,
      [id,body.name??null,body.priceExtra??null,
       body.branchIds?JSON.stringify(body.branchIds):null,
       body.stockByBranch?JSON.stringify(body.stockByBranch):null,
       body.lowStockThreshold??null],
    );
    if (!topping) { res.status(404).json({ error: 'Topping no encontrado' }); return; }
    res.status(200).json(topping); return;
  }
  if (req.method === 'DELETE' && id) {
    await withTransaction(async (tx) => {
      await tx(`update products set topping_ids = topping_ids - $1`, [id]);
      await tx(`delete from toppings where id = $1`, [id]);
    });
    res.status(204).end(); return;
  }
  methodNotAllowed(res, ['GET','POST','PATCH','DELETE']);
}

// ── Categories ────────────────────────────────────────────────────────────────
const CAT_COLS = 'id, name, active';

async function categoriesHandler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const categories = await query<Category>(`select ${CAT_COLS} from categories order by name asc`);
    res.status(200).json(categories); return;
  }
  if (req.method === 'POST' && !id) {
    const body = requireBody<Partial<Category>>(req);
    if (!body.name) { res.status(400).json({ error: 'El nombre es obligatorio' }); return; }
    const newId = body.id || 'cat_' + Date.now().toString(36);
    try {
      const rows = await query<Category>(
        `insert into categories (id, name, active) values ($1,$2,$3) returning ${CAT_COLS}`,
        [newId, body.name, body.active ?? true],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      const dbError = err as { code?: string };
      if (dbError.code === '23505') { res.status(409).json({ error: 'La categoría ya existe' }); }
      else { throw err; }
    }
    return;
  }
  if (req.method === 'DELETE' && id) {
    const cat = await queryOne<Category>('select name from categories where id = $1', [id]);
    if (cat) { await query('delete from products where category = $1', [cat.name]); }
    await query('delete from categories where id = $1', [id]);
    res.status(204).end(); return;
  }
  methodNotAllowed(res, ['GET','POST','DELETE']);
}

// ── Router principal ──────────────────────────────────────────────────────────
async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url ?? '';
  if (url.includes('/api/products')) return productsHandler(req, res);
  if (url.includes('/api/toppings')) return toppingsHandler(req, res);
  if (url.includes('/api/categories')) return categoriesHandler(req, res);
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export default withErrorHandling(handler);
