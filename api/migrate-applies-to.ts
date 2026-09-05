import { query } from './_lib/db.js';

async function main() {
  console.log('Agregando applies_to a la tabla coupons...');
  
  await query(`
    ALTER TABLE coupons
    ADD COLUMN IF NOT EXISTS applies_to VARCHAR(100) DEFAULT 'ALL' NOT NULL;
  `);

  console.log('✅ Migración completada.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
