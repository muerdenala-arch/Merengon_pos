import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addRequirePhoto() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS require_photo BOOLEAN DEFAULT true');
    console.log('Columna require_photo añadida a qr_codes exitosamente.');
  } catch (e) {
    console.error('Error alterando la tabla:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

addRequirePhoto();
