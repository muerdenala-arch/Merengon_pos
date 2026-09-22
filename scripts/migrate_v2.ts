import { query } from '../api/_lib/db.js';
import * as dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Running database migrations (v2)...');

  try {
    // 1. Promotions table updates (add start_date and end_date)
    await query(`
      ALTER TABLE promotions 
      ADD COLUMN IF NOT EXISTS start_date timestamptz,
      ADD COLUMN IF NOT EXISTS end_date timestamptz;
    `);
    console.log('✅ Promotions table updated');

    // 2. Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL
      );
    `);
    
    // Insert default setting for QR
    const qrSettingExists = await query(`SELECT key FROM settings WHERE key = 'require_qr_photo'`);
    if (qrSettingExists.length === 0) {
      await query(`INSERT INTO settings (key, value) VALUES ('require_qr_photo', 'true'::jsonb)`);
    }
    console.log('✅ Settings table created and populated');

    // 3. Stock Movements table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id text PRIMARY KEY,
        product_id text NOT NULL,
        branch_id text NOT NULL,
        quantity_change integer NOT NULL,
        type text NOT NULL, -- 'SALE', 'MANUAL_ADJUSTMENT', 'RESTOCK'
        notes text,
        user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements (product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON stock_movements (branch_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at DESC);
    `);
    console.log('✅ Stock movements table created');

    // 4. Bodega Branch
    const bodegaExists = await query(`SELECT id FROM branches WHERE id = 'bodega'`);
    if (bodegaExists.length === 0) {
      await query(`
        INSERT INTO branches (id, name, address, phone, active) 
        VALUES ('bodega', 'Bodega Central', 'Almacén Principal', '', true)
      `);
      console.log('✅ Bodega branch created');
    }

    console.log('🎉 Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }

  process.exit(0);
}

main();
