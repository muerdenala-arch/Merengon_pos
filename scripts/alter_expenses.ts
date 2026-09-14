import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Altering table expenses...');
    await client.query(`
      ALTER TABLE expenses 
      ALTER COLUMN cash_register_id DROP NOT NULL,
      ALTER COLUMN branch_id DROP NOT NULL;
    `);
    console.log('✅ Alter table success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

main();
