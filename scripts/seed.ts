import { query } from '../api/_lib/db.js';

async function main() {
  console.log('Iniciando sincronización del catálogo maestro (EL MERENGON)...');

  const branchesResult = await query('SELECT id, name FROM branches');
  const branches = branchesResult as { id: string; name: string }[];
  
  const centralId = 'central'; // Tercer punto de venta
  const allBranchIds = branches.map(b => b.id);

  // 1. CATEGORÍAS
  const categories = [
    { id: 'cat_fresas', name: 'Vasos de Fresas con Crema', active: true },
    { id: 'cat_queques', name: 'Queques Volcán y Tortas', active: true },
    { id: 'cat_porciones', name: 'Porciones de Tortas', active: true },
    { id: 'cat_postres', name: 'Otros Postres', active: true },
    { id: 'cat_bebidas', name: 'Bebidas / Para Tomar', active: true },
  ];

  for (const cat of categories) {
    const existing = await query('SELECT id FROM categories WHERE name = $1', [cat.name]);
    if (existing.length > 0) {
      cat.id = existing[0].id as string;
      await query(`UPDATE categories SET active = $1 WHERE id = $2`, [cat.active, cat.id]);
    } else {
      await query(`INSERT INTO categories (id, name, active) VALUES ($1, $2, $3)`, [cat.id, cat.name, cat.active]);
    }
  }
  console.log('✅ Categorías sincronizadas.');

  // 2. TOPPINGS
  const toppings = [
    { id: 'top_leche_cond', name: 'Leche condensada', price: 0 },
    { id: 'top_nutella', name: 'Nutella', price: 0 },
    { id: 'top_leche_polvo', name: 'Leche en polvo', price: 0 },
    { id: 'top_chubi', name: 'Chubi', price: 0 },
    { id: 'top_oreo', name: 'Galleta Oreo', price: 0 },
    { id: 'top_gotitas', name: 'Gotitas de chocolate', price: 0 },
    { id: 'top_chispas_colores', name: 'Chispas de colores', price: 0 },
    { id: 'top_chispas_choco', name: 'Chispas de chocolate', price: 0 },
  ];

  for (const top of toppings) {
    // Stock inicial de 50 por sucursal habilitada
    const stockObj: Record<string, number> = {};
    for (const bId of allBranchIds) {
      stockObj[bId] = 50;
    }
    const stock = JSON.stringify(stockObj);
    
    const existing = await query('SELECT id FROM toppings WHERE name = $1', [top.name]);
    if (existing.length > 0) {
      top.id = existing[0].id as string;
      await query(`UPDATE toppings SET price_extra = $1, branch_ids = $2, stock_by_branch = $3 WHERE id = $4`, [top.price, JSON.stringify(allBranchIds), stock, top.id]);
    } else {
      await query(`
        INSERT INTO toppings (id, name, price_extra, stock_by_branch, branch_ids) 
        VALUES ($1, $2, $3, $4, $5)
      `, [top.id, top.name, top.price, stock, JSON.stringify(allBranchIds)]);
    }
  }
  console.log('✅ Toppings oficiales registrados.');

  const allToppingIds = toppings.map(t => t.id);

  // 3. PRODUCTOS
  const products = [
    // A. Vasos de Fresas con Crema (TODAS LAS SUCURSALES)
    {
      id: 'prod_fresas_trad',
      name: 'Fresas con Crema Tradicional',
      category: 'Vasos de Fresas con Crema',
      desc: 'Opciones de base: Leche condensada o Nutella',
      basePrice: 0,
      sizes: [
        { id: 'size_250', label: '250 ml', ounces: 8, price: 18 },
        { id: 'size_350', label: '350 ml', ounces: 12, price: 25 },
        { id: 'size_500', label: '500 ml', ounces: 16, price: 35 },
        { id: 'size_750', label: '750 ml', ounces: 24, price: 55 },
      ],
      toppingIds: allToppingIds,
      branchIds: allBranchIds
    },
    {
      id: 'prod_fresas_mixta',
      name: 'Fresas Mixtas (Durazno y Fresa)',
      category: 'Vasos de Fresas con Crema',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 12, price: 28 },
        { id: 'size_gra', label: 'Grande', ounces: 16, price: 38 },
      ],
      toppingIds: allToppingIds,
      branchIds: allBranchIds
    },
    {
      id: 'prod_fresas_comb',
      name: 'Fresa Combinada (Durazno, Fresas, Guineo)',
      category: 'Vasos de Fresas con Crema',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_250', label: '250 ml', ounces: 8, price: 18 },
        { id: 'size_350', label: '350 ml', ounces: 12, price: 25 },
        { id: 'size_500', label: '500 ml', ounces: 16, price: 35 },
        { id: 'size_750', label: '750 ml', ounces: 24, price: 55 },
      ],
      toppingIds: allToppingIds,
      branchIds: allBranchIds
    },
    // B. Queques Volcán y Tortas (EXCLUSIVO SUCURSAL 3)
    {
      id: 'prod_queque_choco',
      name: 'Queque de Chocolate',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 35 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 45 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_nido',
      name: 'Queque de Nido',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 35 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 45 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_doblon',
      name: 'Queque de Doblón',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 35 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 45 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_choco_oreo',
      name: 'Queque Choco-Oreo',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 35 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 45 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_nucita',
      name: 'Queque de Nucita',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 40 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 50 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_chocodoblon',
      name: 'Queque ChocoDoblón',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 40 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 50 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_queque_bombom',
      name: 'Queque de Bom Bom',
      category: 'Queques Volcán y Tortas',
      desc: '',
      basePrice: 0,
      sizes: [
        { id: 'size_med', label: 'Mediano', ounces: 0, price: 45 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 60 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_torta_tres_leches',
      name: 'Torta de Tres Leches (Entera)',
      category: 'Queques Volcán y Tortas',
      desc: 'Precio único',
      basePrice: 120,
      sizes: [],
      toppingIds: [],
      branchIds: [centralId]
    },
    {
      id: 'prod_torta_fresas',
      name: 'Torta de Fresas con Crema (Entera)',
      category: 'Queques Volcán y Tortas',
      desc: 'Opciones de Leche Condensada o Nutella',
      basePrice: 0,
      sizes: [
        { id: 'size_leche', label: 'Con Leche Condensada', ounces: 0, price: 95 },
        { id: 'size_nutella', label: 'Con Nutella', ounces: 0, price: 110 },
      ],
      toppingIds: [],
      branchIds: [centralId]
    },
    // C. Porciones de Tortas (EXCLUSIVO SUCURSAL 3)
    { id: 'prod_porc_tres_leches', name: 'Porción de Tres Leches', category: 'Porciones de Tortas', desc: '', basePrice: 25, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_porc_nido', name: 'Porción de Queque de Nido', category: 'Porciones de Tortas', desc: '', basePrice: 18, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_porc_chocodob', name: 'Porción de ChocoDoblón', category: 'Porciones de Tortas', desc: '', basePrice: 18, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_porc_choco', name: 'Porción de Chocolate', category: 'Porciones de Tortas', desc: '', basePrice: 18, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_porc_bombom', name: 'Porción de Bom Bom', category: 'Porciones de Tortas', desc: '', basePrice: 20, sizes: [], toppingIds: [], branchIds: [centralId] },
    // D. Otros Postres (EXCLUSIVO SUCURSAL 3)
    { id: 'prod_cremoso_oreo', name: 'Cremosito de Oreo', category: 'Otros Postres', desc: '', basePrice: 25, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_pave_leche', name: 'Pavé de Leche', category: 'Otros Postres', desc: '', basePrice: 25, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_merengon', name: 'Merengón Clásico', category: 'Otros Postres', desc: '', basePrice: 25, sizes: [], toppingIds: [], branchIds: [centralId] },
    { id: 'prod_pavlova', name: 'Pavlova', category: 'Otros Postres', desc: '', basePrice: 40, sizes: [], toppingIds: [], branchIds: [centralId] },
    { 
      id: 'prod_arroz_leche', name: 'Arroz con Leche', category: 'Otros Postres', 
      desc: 'Con Nutella o Leche Condensada', 
      basePrice: 0, 
      sizes: [
        { id: 'size_per', label: 'Personal', ounces: 0, price: 15 },
        { id: 'size_gra', label: 'Grande', ounces: 0, price: 25 },
      ], 
      toppingIds: [], branchIds: [centralId] 
    },
    // E. Bebidas (EXCLUSIVO SUCURSAL 3)
    { id: 'prod_beb_coca_500', name: 'Coca-Cola 500 ml', category: 'Bebidas / Para Tomar', desc: '', basePrice: 8, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_aqua_pera', name: 'Jugo Aquarius Pera 500 ml', category: 'Bebidas / Para Tomar', desc: '', basePrice: 8, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_aqua_pom', name: 'Jugo Aquarius Pomelo 500 ml', category: 'Bebidas / Para Tomar', desc: '', basePrice: 8, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_triny', name: 'Triny Pequeña', category: 'Bebidas / Para Tomar', desc: '', basePrice: 3, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_coca_peq', name: 'Coca-Cola Pequeña (Plástica)', category: 'Bebidas / Para Tomar', desc: '', basePrice: 4, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_coca_2l', name: 'Coca-Cola 2 Litros', category: 'Bebidas / Para Tomar', desc: '', basePrice: 13, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_coca_vidrio', name: 'Coca-Cola de Vidrio', category: 'Bebidas / Para Tomar', desc: '', basePrice: 10, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
    { id: 'prod_beb_coca_vidrio_mini', name: 'Mini Coca-Cola Vidrio', category: 'Bebidas / Para Tomar', desc: '', basePrice: 4, sizes: [], toppingIds: [], branchIds: [centralId], unit: 'Botellas' },
  ];

  for (const p of products) {
    const existing = await query('SELECT id FROM products WHERE name = $1', [p.name]);
    const finalId = existing.length > 0 ? (existing[0].id as string) : p.id;
    
    // We need the category ID for the product.
    const cat = categories.find(c => c.name === p.category);
    
    // Stock inicial de 50 por cada sucursal donde el producto esté disponible
    const stockObj: Record<string, number> = {};
    for (const bId of p.branchIds) {
      stockObj[bId] = 50;
    }
    const stock = JSON.stringify(stockObj);
    const lowStockThreshold = 10;
    
    if (existing.length > 0) {
      await query(`
        UPDATE products SET 
          category = $1, description = $2, base_price = $3, sizes = $4, topping_ids = $5,
          branch_ids = $6, unit = $7, stock_by_branch = $8, low_stock_threshold = $9, active = true
        WHERE id = $10
      `, [cat?.id || p.category, p.desc, p.basePrice, JSON.stringify(p.sizes), JSON.stringify(p.toppingIds), JSON.stringify(p.branchIds), p.unit || 'unidades', stock, lowStockThreshold, finalId]);
    } else {
      await query(`
        INSERT INTO products (
          id, name, category, description, base_price, sizes, topping_ids, branch_ids, active, stock_by_branch, low_stock_threshold, unit, gradient, emoji
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, '', '')
      `, [finalId, p.name, cat?.id || p.category, p.desc, p.basePrice, JSON.stringify(p.sizes), JSON.stringify(p.toppingIds), JSON.stringify(p.branchIds), stock, lowStockThreshold, p.unit || 'unidades']);
    }
  }
  console.log('✅ Catálogo de productos sincronizado.');

  // 4. CÓDIGO QR TERCER PUNTO
  await query(`
    INSERT INTO qr_codes (id, alias, bank_or_holder, image_url, active, branch_id)
    VALUES ('qr_central', 'QR Principal', 'Carla Valeria Ovirece Susaño', '', true, $1)
    ON CONFLICT (id) DO UPDATE SET bank_or_holder = EXCLUDED.bank_or_holder, branch_id = EXCLUDED.branch_id
  `, [centralId]);
  console.log('✅ Configuración de Código QR registrada para el Tercer Punto.');

  console.log('🎉 Sincronización completa con éxito.');
  process.exit(0);
}

main().catch(console.error);
