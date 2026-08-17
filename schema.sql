-- ============================================================================
-- Jugoso POS — esquema de base de datos (Neon / PostgreSQL)
-- ============================================================================
-- Reemplaza la persistencia exclusiva en localStorage: esta es la fuente de
-- verdad central que comparten todos los dispositivos (PCs, celulares).
--
-- Diseño: las estructuras anidadas del dominio (tallas de un producto, stock
-- por sucursal, ítems de una venta, datos del pago) se guardan como JSONB en
-- vez de normalizarse en más tablas — reflejan 1:1 los tipos de TypeScript en
-- src/types/index.ts, así que el resto de la app no cambia de forma.
--
-- Es seguro volver a correr este archivo completo: todo usa
-- IF NOT EXISTS / ON CONFLICT DO NOTHING, así que no duplica ni borra datos
-- que ya hayas creado usando la app.
-- ============================================================================

-- ── Sucursales ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  address    text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Personal / cajeros ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  pin         text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('admin', 'cajero')),
  color       text NOT NULL DEFAULT 'bg-primary-500',
  status      text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'bloqueado')),
  protected   boolean NOT NULL DEFAULT false,
  -- Array de ids de sucursal, ej. ["central", "norte"]
  branch_ids  jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Toppings (complementos) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS toppings (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  price_extra         numeric(10, 2) NOT NULL DEFAULT 0,
  -- { [branchId]: cantidad }
  stock_by_branch     jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Catálogo de productos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  category             text NOT NULL,
  description          text NOT NULL DEFAULT '',
  base_price           numeric(10, 2) NOT NULL DEFAULT 0,
  gradient             text NOT NULL DEFAULT '',
  emoji                text NOT NULL DEFAULT '',
  -- [{ id, label, ounces, priceDelta }]
  sizes                jsonb NOT NULL DEFAULT '[]',
  -- ["agua", "leche", ...]
  base_liquida_options jsonb NOT NULL DEFAULT '[]',
  allow_sugar_level    boolean NOT NULL DEFAULT true,
  -- ["chia", "granola", ...]
  topping_ids          jsonb NOT NULL DEFAULT '[]',
  active               boolean NOT NULL DEFAULT true,
  -- { [branchId]: cantidad }
  stock_by_branch      jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold  integer NOT NULL DEFAULT 0,
  unit                 text NOT NULL DEFAULT 'unidades',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Códigos QR de cobro (imagen sube a Cloudinary, acá se guarda la URL) ──
CREATE TABLE IF NOT EXISTS qr_codes (
  id             text PRIMARY KEY,
  alias          text NOT NULL,
  bank_or_holder text NOT NULL DEFAULT '',
  image_url      text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  branch_id      text NOT NULL REFERENCES branches (id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Aperturas / cierres de caja ──────────────────────────────────────────
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

-- Número de ticket correlativo y atómico entre todos los dispositivos.
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1001;

-- ── Ventas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                  text PRIMARY KEY,
  ticket_number       integer NOT NULL DEFAULT nextval('ticket_number_seq'),
  -- [{ lineId, product, modifiers, quantity, unitPrice, lineTotal, notes }]
  items               jsonb NOT NULL,
  subtotal            numeric(10, 2) NOT NULL,
  total               numeric(10, 2) NOT NULL,
  -- { method, amount, receiptImage } — receiptImage es la URL de Cloudinary
  payment             jsonb NOT NULL,
  cashier_id          text NOT NULL,
  cashier_name        text NOT NULL,
  register_session_id text NOT NULL REFERENCES register_sessions (id),
  branch_id           text NOT NULL REFERENCES branches (id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Índices para las consultas más frecuentes del panel admin ──────────────
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales (register_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_register_sessions_branch ON register_sessions (branch_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_status ON register_sessions (status);
-- Respalda el `order by opened_at desc limit 500` de /api/register-sessions — sin esto
-- Postgres tiene que ordenar la tabla completa en cada poll de 6s a medida que crece.
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_at ON register_sessions (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_branch ON qr_codes (branch_id);

-- ============================================================================
-- Datos semilla — mismos valores que src/data/seed.ts, para que el primer
-- arranque contra Neon se vea igual que la demo local. No pisa nada si ya
-- existen filas con esos ids (ON CONFLICT DO NOTHING).
-- ============================================================================

INSERT INTO branches (id, name, address, phone, active) VALUES
  ('central', 'Sucursal Central', 'Av. Principal 123, Centro', '700-00001', true),
  ('norte',   'Sucursal Norte',   'Av. Norte 456, Zona Norte', '700-00002', true),
  ('sur',     'Sucursal Sur',     'Av. Sur 789, Zona Sur',     '700-00003', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (id, name, pin, role, color, status, protected, branch_ids, created_at) VALUES
  ('u-admin',   'Valeria Ríos', '1234', 'admin',  'bg-accent-500',    'activo', true,  '["central","norte","sur"]', '2026-01-05T09:00:00.000Z'),
  ('u-cajero1', 'Diego Mamani', '1111', 'cajero', 'bg-primary-500',   'activo', false, '["central"]',              '2026-02-12T09:00:00.000Z'),
  ('u-cajero2', 'Ana Quispe',   '2222', 'cajero', 'bg-secondary-500', 'activo', false, '["central","norte","sur"]', '2026-03-20T09:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO toppings (id, name, price_extra, stock_by_branch, low_stock_threshold) VALUES
  ('chia',     'Chía',           2,   '{"central":40,"norte":24,"sur":14}', 8),
  ('granola',  'Granola',        2.5, '{"central":35,"norte":21,"sur":12}', 8),
  ('coco',     'Coco rallado',   2,   '{"central":30,"norte":18,"sur":11}', 6),
  ('miel',     'Miel de abeja',  1.5, '{"central":25,"norte":15,"sur":9}',  5),
  ('avena',    'Avena',          1.5, '{"central":5,"norte":3,"sur":2}',    8),
  ('colageno', 'Colágeno',       4,   '{"central":18,"norte":11,"sur":6}',  5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (
  id, name, category, description, base_price, gradient, emoji, sizes,
  base_liquida_options, allow_sugar_level, topping_ids, active, stock_by_branch,
  low_stock_threshold, unit
) VALUES
  ('p-papaya', 'Jugo de Papaya', 'Jugos Naturales', 'Papaya fresca licuada al momento.', 10,
   'from-orange-400 to-amber-500', '🥭',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","leche","leche_almendras"]', true, '["chia","granola","miel","colageno"]', true,
   '{"central":24,"norte":14,"sur":8}', 8, 'porciones'),

  ('p-piña', 'Jugo de Piña', 'Jugos Naturales', 'Piña dulce con un toque cítrico.', 10,
   'from-yellow-300 to-orange-400', '🍍',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","yogurt"]', true, '["chia","coco","miel"]', true,
   '{"central":18,"norte":11,"sur":6}', 8, 'porciones'),

  ('p-fresa-platano', 'Fresa con Plátano', 'Smoothies', 'Cremoso batido de fresa y plátano.', 12,
   'from-pink-400 to-rose-500', '🍓',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["leche","leche_almendras","yogurt"]', true, '["granola","miel","coco","colageno"]', true,
   '{"central":6,"norte":4,"sur":2}', 8, 'porciones'),

  ('p-mango', 'Jugo de Mango', 'Jugos Naturales', 'Mango maduro, dulzura natural.', 11,
   'from-orange-400 to-amber-500', '🥭',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","leche","yogurt"]', true, '["chia","granola","coco"]', true,
   '{"central":20,"norte":12,"sur":7}', 8, 'porciones'),

  ('p-verde-detox', 'Verde Detox', 'Especiales', 'Espinaca, apio, pepino y piña.', 13,
   'from-lime-400 to-emerald-500', '🥝',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua"]', false, '["chia","colageno"]', true,
   '{"central":15,"norte":9,"sur":5}', 6, 'porciones'),

  ('p-sandia', 'Jugo de Sandía', 'Jugos Naturales', 'Refrescante y ligero, ideal para el calor.', 9,
   'from-pink-400 to-rose-500', '🍉',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua"]', true, '["chia","miel"]', true,
   '{"central":22,"norte":13,"sur":8}', 8, 'porciones'),

  ('p-maracuya', 'Jugo de Maracuyá', 'Jugos Naturales', 'Ácido y aromático, con un toque de dulzura.', 10,
   'from-yellow-300 to-orange-400', '🍋',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","leche"]', true, '["miel","chia"]', true,
   '{"central":3,"norte":2,"sur":1}', 8, 'porciones'),

  ('p-mix-tropical', 'Mix Tropical', 'Especiales', 'Piña, mango, maracuyá y naranja.', 14,
   'from-fuchsia-400 to-pink-500', '🍹',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","yogurt"]', true, '["chia","granola","coco","miel","colageno"]', true,
   '{"central":16,"norte":10,"sur":6}', 8, 'porciones'),

  ('p-avena-manzana', 'Avena con Manzana', 'Smoothies', 'Avena remojada, manzana y canela.', 11,
   'from-emerald-400 to-teal-500', '🍏',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["leche","leche_almendras","agua"]', true, '["granola","miel","avena"]', true,
   '{"central":12,"norte":7,"sur":4}', 8, 'porciones'),

  ('p-berries', 'Mix de Berries', 'Smoothies', 'Frutos rojos, antioxidantes naturales.', 13,
   'from-red-400 to-orange-500', '🫐',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["leche","leche_almendras","yogurt"]', true, '["chia","granola","colageno"]', true,
   '{"central":9,"norte":5,"sur":3}', 8, 'porciones'),

  ('p-naranja', 'Jugo de Naranja', 'Jugos Naturales', 'Exprimido natural, alto en vitamina C.', 8,
   'from-yellow-300 to-orange-400', '🍊',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua"]', true, '["chia","miel"]', true,
   '{"central":30,"norte":18,"sur":11}', 10, 'porciones'),

  ('p-uva', 'Jugo de Uva', 'Jugos Naturales', 'Uva concord, dulce y antioxidante.', 10,
   'from-purple-400 to-fuchsia-500', '🍇',
   '[{"id":"personal","label":"Personal","ounces":12,"priceDelta":0},{"id":"mediano","label":"Mediano","ounces":16,"priceDelta":3},{"id":"grande","label":"Grande","ounces":22,"priceDelta":6}]',
   '["agua","yogurt"]', true, '["chia","coco"]', true,
   '{"central":14,"norte":8,"sur":5}', 8, 'porciones')
ON CONFLICT (id) DO NOTHING;
