import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query(
      'ALTER TABLE staff ADD COLUMN IF NOT EXISTS requires_payment_photo boolean NOT NULL DEFAULT true',
    );
    console.log('Columna requires_payment_photo añadida a staff exitosamente.');
  } catch (e) {
    console.error('Error alterando la tabla:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
