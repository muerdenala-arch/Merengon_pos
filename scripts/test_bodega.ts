import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkBodega() {
  const client = await pool.connect();
  try {
    const resProducts = await client.query(`SELECT id, name, stock_by_branch FROM products`);
    let bodegaCount = 0;
    for (const p of resProducts.rows) {
      if (p.stock_by_branch && p.stock_by_branch['bodega']) {
        console.log(`- Producto con stock en bodega: ${p.name} (stock: ${p.stock_by_branch['bodega']})`);
        bodegaCount++;
      }
    }
    console.log(`Total productos con stock en bodega: ${bodegaCount}`);

    const resToppings = await client.query(`SELECT id, name, stock_by_branch FROM toppings`);
    let bodegaToppingCount = 0;
    for (const t of resToppings.rows) {
      if (t.stock_by_branch && t.stock_by_branch['bodega']) {
        console.log(`- Topping con stock en bodega: ${t.name} (stock: ${t.stock_by_branch['bodega']})`);
        bodegaToppingCount++;
      }
    }
    console.log(`Total toppings con stock en bodega: ${bodegaToppingCount}`);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBodega();
