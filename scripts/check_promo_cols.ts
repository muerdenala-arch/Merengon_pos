import { sql } from '@vercel/postgres';

async function main() {
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'promotions';
    `;
    console.log("Columnas de promotions:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
