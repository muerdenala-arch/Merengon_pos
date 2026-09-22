import { query } from '../api/_lib/db.js';
import * as dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Agregando Sucursal Patujú y sus productos...');

  const branchId = 'patuju';
  
  // 1. Crear Sucursal
  const branchExists = await query('SELECT id FROM branches WHERE id = $1', [branchId]);
  if (branchExists.length === 0) {
    await query(`INSERT INTO branches (id, name, address, active) VALUES ($1, $2, $3, true)`, [
      branchId, 'Sucursal Patujú', 'Patujú'
    ]);
    console.log('✅ Sucursal Patujú creada.');
  } else {
    console.log('ℹ️ Sucursal Patujú ya existe.');
  }

  // 2. Crear Categorías
  const categories = [
    { id: 'cat_bebidas_pat', name: 'Bebidas' },
    { id: 'cat_golosinas_pat', name: 'Golosinas y Galletas' },
    { id: 'cat_abarrotes_pat', name: 'Abarrotes e Insumos' },
    { id: 'cat_varios_pat', name: 'Limpieza y Varios' },
  ];

  for (const cat of categories) {
    const existing = await query('SELECT id FROM categories WHERE name = $1', [cat.name]);
    if (existing.length === 0) {
      await query(`INSERT INTO categories (id, name, active) VALUES ($1, $2, true)`, [cat.id, cat.name]);
    } else {
      cat.id = existing[0].id as string;
    }
  }
  console.log('✅ Categorías verificadas/creadas.');

  // 3. Productos
  const products = [
    // Bebidas
    { name: 'Agua en bolsita', price: 1, cat: 'Bebidas' },
    { name: 'Agua en botella', price: 5, cat: 'Bebidas' },
    { name: 'Agua en botella 1 L', price: 7, cat: 'Bebidas' },
    { name: 'Agua en botella 2 L', price: 9, cat: 'Bebidas' },
    { name: 'Agua Sante', price: 15, cat: 'Bebidas' },
    { name: 'Coca-Cola personal', price: 7, cat: 'Bebidas' },
    { name: 'Coca-Cola 2 L', price: 14, cat: 'Bebidas' },
    { name: 'Coca-Cola 3 L', price: 19, cat: 'Bebidas' },
    { name: 'Sprite', price: 14, cat: 'Bebidas' },
    { name: 'Fanta', price: 14, cat: 'Bebidas' },
    { name: 'K Melon', price: 5, cat: 'Bebidas' },
    { name: 'Maltín', price: 10, cat: 'Bebidas' },

    // Golosinas
    { name: 'Dulce Eucalipto (3x1)', price: 0.33, cat: 'Golosinas y Galletas' },
    { name: 'Dulce Café (3x1)', price: 0.33, cat: 'Golosinas y Galletas' },
    { name: 'Gomabonbon (3x1)', price: 0.33, cat: 'Golosinas y Galletas' },
    { name: 'Caramelo medio', price: 2, cat: 'Golosinas y Galletas' },
    { name: 'Chupete', price: 1, cat: 'Golosinas y Galletas' },
    { name: 'Galletas Oreo', price: 5, cat: 'Golosinas y Galletas' },
    { name: 'Crosso', price: 1, cat: 'Golosinas y Galletas' },
    { name: 'Oke Buttercream', price: 2, cat: 'Golosinas y Galletas' },

    // Abarrotes
    { name: 'Leche', price: 10, cat: 'Abarrotes e Insumos' },
    { name: 'Leche líquida Bonlé', price: 8, cat: 'Abarrotes e Insumos' },
    { name: 'Leche líquida Pil', price: 10, cat: 'Abarrotes e Insumos' },
    { name: 'Leche crema', price: 55, cat: 'Abarrotes e Insumos' },
    { name: 'Leche condensada', price: 33, cat: 'Abarrotes e Insumos' },
    { name: 'Crema Chanty', price: 60, cat: 'Abarrotes e Insumos' },
    { name: 'Nutella', price: 110, cat: 'Abarrotes e Insumos' },
    { name: 'Durazno (lata)', price: 11, cat: 'Abarrotes e Insumos' },
    { name: 'Azúcar impalpable', price: 3, cat: 'Abarrotes e Insumos' },
    { name: 'Vainilla', price: 26, cat: 'Abarrotes e Insumos' },
    { name: 'Nudes (Fideos)', price: 12, cat: 'Abarrotes e Insumos' },

    // Varios / Limpieza
    { name: 'Alcohol', price: 7, cat: 'Limpieza y Varios' },
    { name: 'Papel Perlita', price: 10, cat: 'Limpieza y Varios' },
    { name: 'Papel Nacional', price: 1.5, cat: 'Limpieza y Varios' },
    { name: 'Persodent', price: 15, cat: 'Limpieza y Varios' },
    { name: 'Shampoo', price: 4, cat: 'Limpieza y Varios' },
  ];

  let added = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const pId = 'pat_' + i;
    
    // Check if exists
    const exists = await query('SELECT id FROM products WHERE name = $1', [p.name]);
    if (exists.length === 0) {
      await query(`
        INSERT INTO products (id, name, description, category, base_price, sizes, topping_ids, branch_ids, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        pId,
        p.name,
        '',
        p.cat,
        p.price,
        '[]',
        '[]',
        JSON.stringify([branchId]), // SOLO para patujú
        true
      ]);
      added++;
    }
  }

  console.log(`✅ ${added} productos nuevos registrados para Patujú.`);
  process.exit(0);
}

main().catch(console.error);
