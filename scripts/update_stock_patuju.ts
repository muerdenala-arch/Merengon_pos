import { query } from '../api/_lib/db.js';
import * as dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Actualizando stock de los productos de Patujú a 50...');

  try {
    const result = await query(`
      UPDATE products 
      SET stock_by_branch = '{"patuju": 50}'::jsonb 
      WHERE id LIKE 'pat_%'
    `);
    console.log('✅ Stock actualizado correctamente para productos de Patujú.');
  } catch (err) {
    console.error('Error al actualizar stock:', err);
  }
  
  process.exit(0);
}

main().catch(console.error);
