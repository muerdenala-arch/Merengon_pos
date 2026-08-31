-- ============================================================================
-- Fresas con Crema EL MERENGON — esquema de base de datos (Neon / PostgreSQL)
-- ============================================================================
-- Todos los precios en Bs (Bolivianos bolivianos).
-- Es seguro volver a correr este archivo completo:
-- IF NOT EXISTS / ON CONFLICT DO NOTHING no duplica ni borra datos existentes.
-- ============================================================================

-- ── Sucursales ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  address    text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Personal / cajeros ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  pin         text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('admin', 'cajero')),
  color       text NOT NULL DEFAULT 'bg-primary-500',
  status      text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'bloqueado')),
  protected   boolean NOT NULL DEFAULT false,
  branch_ids  jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Toppings / Extras ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS toppings (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  price_extra         numeric(10, 2) NOT NULL DEFAULT 0,
  stock_by_branch     jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Catalogo de productos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  category             text NOT NULL,
  description          text NOT NULL DEFAULT '',
  base_price           numeric(10, 2) NOT NULL DEFAULT 0,
  gradient             text NOT NULL DEFAULT '',
  emoji                text NOT NULL DEFAULT '',
  sizes                jsonb NOT NULL DEFAULT '[]',

  topping_ids          jsonb NOT NULL DEFAULT '[]',
  active               boolean NOT NULL DEFAULT true,
  stock_by_branch      jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold  integer NOT NULL DEFAULT 0,
  unit                 text NOT NULL DEFAULT 'vasos',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Codigos QR de cobro ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_codes (
  id             text PRIMARY KEY,
  alias          text NOT NULL,
  bank_or_holder text NOT NULL DEFAULT '',
  image_url      text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  branch_id      text NOT NULL REFERENCES branches (id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Aperturas / cierres de caja ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS register_sessions (
  id                     text PRIMARY KEY,
  cashier_id             text NOT NULL,
  cashier_name           text NOT NULL,
  branch_id              text NOT NULL REFERENCES branches (id),
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  opening_amount         numeric(10, 2) NOT NULL DEFAULT 0,
  closing_amount_counted numeric(10, 2),
  expected_amount        numeric(10, 2),
  difference             numeric(10, 2),
  sales_total            numeric(10, 2),
  sales_count            integer,
  cash_sales_total       numeric(10, 2),
  qr_sales_total         numeric(10, 2),
  status                 text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
  notes                  text
);

-- Numero de ticket correlativo y atomico entre todos los dispositivos.
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1001;

-- ── Ventas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                  text PRIMARY KEY,
  ticket_number       integer NOT NULL DEFAULT nextval('ticket_number_seq'),
  items               jsonb NOT NULL,
  subtotal            numeric(10, 2) NOT NULL,
  total               numeric(10, 2) NOT NULL,
  payment             jsonb NOT NULL,
  cashier_id          text NOT NULL,
  cashier_name        text NOT NULL,
  register_session_id text NOT NULL REFERENCES register_sessions (id),
  branch_id           text NOT NULL REFERENCES branches (id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indices para consultas frecuentes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales (register_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_register_sessions_branch ON register_sessions (branch_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_status ON register_sessions (status);
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_at ON register_sessions (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_branch ON qr_codes (branch_id);

-- ============================================================================
-- DATOS SEMILLA — Fresas con Crema EL MERENGON
-- Todos los precios en Bs (Bolivianos).
-- ON CONFLICT DO NOTHING: seguro de correr multiples veces.
-- ============================================================================

-- ── Sucursales ───────────────────────────────────────────────────────────────
INSERT INTO branches (id, name, address, phone, active) VALUES
  ('central', 'Sucursal Central', 'Av. Principal 123, Centro', '700-00001', true),
  ('norte',   'Sucursal Norte',   'Av. Norte 456, Zona Norte', '700-00002', true),
  ('sur',     'Sucursal Sur',     'Av. Sur 789, Zona Sur',     '700-00003', true)
ON CONFLICT (id) DO NOTHING;

-- ── Personal ─────────────────────────────────────────────────────────────────
INSERT INTO staff (id, name, pin, role, color, status, protected, branch_ids, created_at) VALUES
  ('u-admin',   'Administrador', '1234', 'admin',  'bg-accent-500',    'activo', true,  '["central","norte","sur"]', '2026-01-05T09:00:00.000Z'),
  ('u-cajero1', 'Cajero 1',      '1111', 'cajero', 'bg-primary-500',   'activo', false, '["central"]',               '2026-02-12T09:00:00.000Z'),
  ('u-cajero2', 'Cajero 2',      '2222', 'cajero', 'bg-secondary-500', 'activo', false, '["central","norte","sur"]',  '2026-03-20T09:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- ── Toppings / Extras (precios en Bs) ────────────────────────────────────────
INSERT INTO toppings (id, name, price_extra, stock_by_branch, low_stock_threshold) VALUES
  ('leche-cond', 'Leche condensada',    3, '{"central":50,"norte":30,"sur":18}', 10),
  ('nutella',    'Nutella',             5, '{"central":40,"norte":24,"sur":14}', 8),
  ('oreo',       'Oreo triturada',      4, '{"central":45,"norte":27,"sur":16}', 8),
  ('chispas',    'Chispas de chocolate',3, '{"central":55,"norte":33,"sur":19}', 10),
  ('chantilly',  'Chantilly extra',     4, '{"central":35,"norte":21,"sur":12}', 8),
  ('gomitas',    'Gomitas',             3, '{"central":40,"norte":24,"sur":14}', 8),
  ('manjar',     'Manjar',              4, '{"central":30,"norte":18,"sur":11}', 6),
  ('granola',    'Granola',             3, '{"central":35,"norte":21,"sur":12}', 8),
  ('coco',       'Coco rallado',        3, '{"central":30,"norte":18,"sur":11}', 6),
  ('miel',       'Miel de abeja',       3, '{"central":25,"norte":15,"sur":9}',  5)
ON CONFLICT (id) DO NOTHING;

-- ── Tamanos estandar (referencia de comentario, los tamanos se guardan en el producto) ──
-- Personal:  8 oz  / priceDelta:  0 Bs
-- Mediano:  12 oz  / priceDelta:  5 Bs
-- Grande:   16 oz  / priceDelta: 10 Bs
-- Familiar: 24 oz  / priceDelta: 18 Bs

-- ── Productos ────────────────────────────────────────────────────────────────
INSERT INTO products (
  id, name, category, description, base_price, gradient, emoji, sizes,
  topping_ids, active, stock_by_branch,
  low_stock_threshold, unit
) VALUES

-- == Vasos de Fresas con Crema ================================================
  ('p-fresa-crema', 'Fresas con Crema', 'Vasos de Fresas con Crema',
   'Fresas frescas banadas en crema chantilly. El clasico de EL MERENGON.', 15,
   'from-pink-400 to-rose-500', '🍓',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["leche-cond","nutella","oreo","chispas","chantilly","gomitas","manjar"]',
   true, '{"central":50,"norte":30,"sur":18}', 10, 'vasos'),

  ('p-fresa-leche-cond', 'Fresas con Leche Condensada', 'Vasos de Fresas con Crema',
   'Fresas frescas banadas en leche condensada y crema chantilly.', 15,
   'from-rose-300 to-pink-500', '🍓',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["chantilly","oreo","chispas","gomitas","manjar"]',
   true, '{"central":40,"norte":24,"sur":14}', 10, 'vasos'),

  ('p-fresa-chocolate', 'Fresas con Chocolate', 'Vasos de Fresas con Crema',
   'Fresas cubiertas con salsa de chocolate y crema chantilly.', 17,
   'from-amber-700 to-rose-600', '🍓',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["chantilly","oreo","chispas","gomitas"]',
   true, '{"central":35,"norte":21,"sur":12}', 8, 'vasos'),

  ('p-fresa-nutella', 'Fresas con Nutella', 'Vasos de Fresas con Crema',
   'Fresas frescas con abundante Nutella y crema chantilly.', 18,
   'from-amber-600 to-red-500', '🍓',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["chantilly","oreo","chispas","leche-cond"]',
   true, '{"central":35,"norte":21,"sur":12}', 8, 'vasos'),

-- == Otros Postres ============================================================
  ('p-durazno-crema', 'Duraznos con Crema', 'Otros Postres',
   'Duraznos en almibar con crema chantilly y toppings dulces.', 14,
   'from-orange-300 to-amber-400', '🍑',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["leche-cond","chantilly","oreo","gomitas","granola"]',
   true, '{"central":30,"norte":18,"sur":11}', 8, 'vasos'),

  ('p-ensalada-frutas', 'Ensalada de Frutas con Crema', 'Otros Postres',
   'Mix de frutas frescas de temporada con crema chantilly.', 18,
   'from-fuchsia-400 to-pink-500', '🍉',
   '[{"id":"personal","label":"Personal","ounces":8,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":12,"priceDelta":5},{"id":"grande","label":"Grande","ounces":16,"priceDelta":10},{"id":"familiar","label":"Familiar","ounces":24,"priceDelta":18}]',
   '["leche-cond","chantilly","oreo","granola","coco","miel"]',
   true, '{"central":25,"norte":15,"sur":9}', 6, 'vasos'),

  ('p-brownie-crema', 'Brownie con Crema y Fresas', 'Otros Postres',
   'Brownie de chocolate con crema chantilly y fresas frescas.', 22,
   'from-amber-800 to-red-600', '🍫',
   '[{"id":"individual","label":"Individual","ounces":0,"priceDelta":0},{"id":"doble","label":"Doble","ounces":0,"priceDelta":12}]',
   '["chantilly","chispas","nutella","leche-cond"]',
   true, '{"central":15,"norte":9,"sur":5}', 5, 'porciones'),

-- == Bebidas / Frappés / Batidos ==============================================
  ('p-frappe-fresa', 'Frappe de Fresa', 'Bebidas / Frappés / Batidos',
   'Frappe helado de fresa natural con crema y chispas de chocolate.', 18,
   'from-pink-400 to-fuchsia-500', '🥤',
   '[{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":0},{"id":"grande","label":"Grande","ounces":22,"priceDelta":7}]',
   '["chantilly","oreo","chispas"]',
   true, '{"central":30,"norte":18,"sur":11}', 8, 'vasos'),

  ('p-batido-fresa', 'Batido de Fresa', 'Bebidas / Frappés / Batidos',
   'Batido cremoso de fresa con leche y helado.', 16,
   'from-rose-300 to-pink-500', '🥛',
   '[{"id":"mediano","label":"Mediano","ounces":14,"priceDelta":0},{"id":"grande","label":"Grande","ounces":20,"priceDelta":6}]',
   '["chantilly","oreo","chispas","leche-cond"]',
   true, '{"central":30,"norte":18,"sur":11}', 8, 'vasos'),

  ('p-frappe-nutella', 'Frappe de Nutella', 'Bebidas / Frappés / Batidos',
   'Frappe helado de Nutella con crema chantilly y Oreo triturada.', 20,
   'from-amber-600 to-orange-500', '☕',
   '[{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":0},{"id":"grande","label":"Grande","ounces":22,"priceDelta":7}]',
   '["chantilly","oreo","chispas"]',
   true, '{"central":25,"norte":15,"sur":9}', 6, 'vasos'),

  ('p-limonada-fresa', 'Limonada de Fresa', 'Bebidas / Frappés / Batidos',
   'Limonada fresca con fresas naturales. Refrescante y deliciosa.', 13,
   'from-yellow-300 to-pink-400', '🍋',
   '[{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":0},{"id":"grande","label":"Grande","ounces":22,"priceDelta":5}]',
   '["chantilly","gomitas"]',
   true, '{"central":40,"norte":24,"sur":14}', 10, 'vasos')

ON CONFLICT (id) DO NOTHING;
