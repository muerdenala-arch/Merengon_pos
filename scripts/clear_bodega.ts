import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clearBodega() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Borrando movimientos de stock de la bodega...');
    await client.query(`DELETE FROM stock_movements WHERE branch_id = 'bodega'`);

    console.log('Limpiando stock en productos...');
    // Removemos la clave 'bodega' del jsonb de stock_by_branch en products
    await client.query(`
      UPDATE products 
      SET stock_by_branch = stock_by_branch - 'bodega' 
      WHERE stock_by_branch ? 'bodega'
    `);

    console.log('Limpiando stock en toppings...');
    // Removemos la clave 'bodega' del jsonb de stock_by_branch en toppings
    await client.query(`
      UPDATE toppings 
      SET stock_by_branch = stock_by_branch - 'bodega' 
      WHERE stock_by_branch ? 'bodega'
    `);

    await client.query('COMMIT');
    console.log('¡Bodega vaciada correctamente!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error vaciando bodega:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

clearBodega();
