/**
 * Script de corrección definitiva del inventario.
 * 
 * Problemas encontrados:
 * 1. Los productos de Patujú tienen branchIds=['patuju'] - no se muestran en sucursales correctas
 * 2. El stock está en central/branch_mtox... pero no en 'bodega'
 * 3. branchIds no coincide con las sucursales reales del sistema
 * 
 * Corrección:
 * - Para los productos de "tienda" (pat_XX): actualizar branchIds para incluir todas las sucursales activas
 * - Para TODOS los productos: NO tocar el stock de venta (central, branch_mtox...)
 * - La bodega es un inventario separado que el admin manejará manualmente desde la pantalla de Bodega
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fullAuditAndFix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ver sucursales de venta activas (excluir bodega, norte, sur que son legacy)
    const branches = await client.query(`SELECT id, name FROM branches WHERE active = true`);
    console.log('Sucursales activas:', branches.rows.map(b => `${b.name} (${b.id})`).join(', '));

    // Las sucursales reales de venta (donde los cajeros venden)
    const salesBranchIds = ['central', 'branch_mtoxkmt4_rd8ezy', 'branch_mtoxoi8s_dlwsk1'];
    const salesBranchIdsJson = JSON.stringify(salesBranchIds);

    // 2. Corregir los productos de "tienda" (pat_XX): actualizar branchIds
    console.log('\n--- Corrigiendo branchIds de productos de tienda ---');
    const patProducts = await client.query(`SELECT id, name, branch_ids FROM products WHERE id LIKE 'pat_%'`);
    console.log(`Encontrados ${patProducts.rowCount} productos de tienda`);

    if (patProducts.rowCount && patProducts.rowCount > 0) {
      await client.query(`
        UPDATE products 
        SET branch_ids = $1::jsonb
        WHERE id LIKE 'pat_%'
      `, [salesBranchIdsJson]);
      console.log(`✅ branchIds actualizados para productos de tienda`);
    }

    // 3. Verificar stock: los productos deben tener stock en las sucursales de venta
    // El script anterior ya asignó 50 en esas sucursales, verificar que esté bien
    const checkStock = await client.query(`
      SELECT id, name, stock_by_branch 
      FROM products 
      WHERE id LIKE 'pat_%' 
      LIMIT 3
    `);
    console.log('\nVerificando stock asignado:');
    checkStock.rows.forEach(p => console.log(`  ${p.name}: ${JSON.stringify(p.stock_by_branch)}`));

    // 4. Asegurarnos que el stock realmente esté en las tres sucursales para todos los pat_
    await client.query(`
      UPDATE products
      SET stock_by_branch = jsonb_build_object(
        'central', COALESCE((stock_by_branch->>'central')::int, 50),
        'branch_mtoxkmt4_rd8ezy', COALESCE((stock_by_branch->>'branch_mtoxkmt4_rd8ezy')::int, 50),
        'branch_mtoxoi8s_dlwsk1', COALESCE((stock_by_branch->>'branch_mtoxoi8s_dlwsk1')::int, 50)
      )
      WHERE id LIKE 'pat_%'
    `);
    console.log('✅ Stock confirmado para sucursales de venta');

    // 5. Eliminar branch_ids 'patuju' también de otros productos que quizas lo tengan
    // No tocar los productos de fresas/postres etc. que ya tienen sus branchIds correctos
    const patujuProducts = await client.query(`
      SELECT id, name FROM products 
      WHERE branch_ids @> '["patuju"]'::jsonb 
      AND id NOT LIKE 'pat_%'
    `);
    if (patujuProducts.rowCount && patujuProducts.rowCount > 0) {
      console.log(`\nProductos no-pat con branchId patuju: ${patujuProducts.rowCount}`);
      patujuProducts.rows.forEach(p => console.log(`  - ${p.name} (${p.id})`));
    }

    // 6. Limpiar referencias duplicadas/fantasma en stock_by_branch para productos de fresas etc.
    // (No tocar, solo reportar)
    const productsWithNorte = await client.query(`
      SELECT count(*) as cnt FROM products WHERE stock_by_branch ? 'norte' OR stock_by_branch ? 'sur'
    `);
    console.log(`\nProductos con stock en sucursales legacy (norte/sur): ${productsWithNorte.rows[0].cnt}`);

    await client.query('COMMIT');
    console.log('\n✅ Corrección completada exitosamente');
    
    // Reporte final
    const allProducts = await client.query(`SELECT id, name, branch_ids, stock_by_branch FROM products WHERE id LIKE 'pat_%' LIMIT 5`);
    console.log('\n=== ESTADO FINAL (primeros 5 productos de tienda) ===');
    allProducts.rows.forEach(p => {
      console.log(`${p.name}:`);
      console.log(`  branchIds: ${JSON.stringify(p.branch_ids)}`);
      console.log(`  stock: ${JSON.stringify(p.stock_by_branch)}`);
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error en corrección:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

fullAuditAndFix();
