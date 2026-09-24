import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, Minus, Plus } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCatalogStore } from '@/store/catalogStore';
import { useBranchStore } from '@/store/branchStore';
import type { Product } from '@/types';
import { SIZELESS_KEY } from '@/types';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const products = useCatalogStore((s) => s.products);
  const toppings = useCatalogStore((s) => s.toppings);
  const adjustToppingStock = useCatalogStore((s) => s.adjustToppingStock);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);

  const [selectedBranchId, setSelectedBranchId] = useState(
    () => adminFilterBranchId ?? branches[0]?.id ?? '',
  );
  const branch = branches.find((b) => b.id === selectedBranchId);

  // Si el filtro global de sucursal cambia (ej. la campana de alertas de stock manda a
  // reponer un producto de otra sucursal), seguirlo aunque la página ya esté montada.
  useEffect(() => {
    if (adminFilterBranchId) setSelectedBranchId(adminFilterBranchId);
  }, [adminFilterBranchId]);

  const branchProducts = useMemo(
    () => products.filter((p) => p.branchIds.includes(selectedBranchId)),
    [products, selectedBranchId],
  );

  const branchToppings = useMemo(
    () => toppings.filter((t) => t.branchIds.includes(selectedBranchId)),
    [toppings, selectedBranchId],
  );

  // Cada tamaño cuenta como un ítem aparte para la alerta — un producto con 3 tamaños
  // agotados y 1 con stock son "3 ítems con stock bajo", no "1 producto".
  const lowStockCount = useMemo(
    () =>
      branchProducts.reduce((count, p) => {
        const sizeIds = p.sizes.length > 0 ? p.sizes.map((s) => s.id) : [SIZELESS_KEY];
        return count + sizeIds.filter((id) => (p.stockByBranch[selectedBranchId]?.[id] ?? 0) <= p.lowStockThreshold).length;
      }, 0) +
      branchToppings.filter((t) => (t.stockByBranch[selectedBranchId] ?? 0) <= t.lowStockThreshold).length,
    [branchProducts, branchToppings, selectedBranchId],
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Boxes size={24} className="text-primary-500" /> Inventario
          </h1>
          <p className="text-sm text-ink-muted">Stock independiente por sucursal — elige cuál gestionar.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
                  selectedBranchId === b.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-cream-300 text-ink-muted hover:bg-cream-200',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>

          {lowStockCount > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
              <AlertTriangle size={16} />
              {lowStockCount} ítem{lowStockCount > 1 ? 's' : ''} con stock bajo en {branch?.name ?? 'esta sucursal'}
            </div>
          )}
        </div>

        <h2 className="mb-3 font-display text-lg font-bold text-ink">Productos</h2>
        <motion.div
          key={`products-${selectedBranchId}`}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-8 space-y-2.5"
        >
          {branchProducts.length === 0 ? (
            <p className="text-sm text-ink-muted">No hay productos habilitados para esta sucursal.</p>
          ) : (
            branchProducts.map((product) => (
              <ProductStockCard key={product.id} product={product} branchId={selectedBranchId} />
            ))
          )}
        </motion.div>

        <h2 className="mb-3 font-display text-lg font-bold text-ink">Agregados / Toppings</h2>
        <motion.div
          key={`toppings-${selectedBranchId}`}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2.5"
        >
          {branchToppings.length === 0 ? (
            <p className="text-sm text-ink-muted">No hay agregados habilitados para esta sucursal.</p>
          ) : (
            branchToppings.map((topping) => (
              <StockRow
                key={topping.id}
                name={topping.name}
                category="Topping"
                stock={topping.stockByBranch[selectedBranchId] ?? 0}
                threshold={topping.lowStockThreshold}
                unit="porciones"
                onAdjust={(delta) => adjustToppingStock(topping.id, selectedBranchId, delta)}
                onSetStock={(val) => useCatalogStore.getState().setToppingStock(topping.id, selectedBranchId, val)}
              />
            ))
          )}
        </motion.div>
      </div>
    </AdminShell>
  );
}

/** Tarjeta de un producto con UNA fila de stock por cada tamaño/presentación — cada
 *  tamaño se descuenta y se repone de forma independiente (ver Product.stockByBranch). */
function ProductStockCard({ product, branchId }: { product: Product; branchId: string }) {
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const setStock = useCatalogStore((s) => s.setStock);

  // Productos sin tamaños (ej. insumos) muestran una sola fila bajo SIZELESS_KEY.
  const sizes = product.sizes.length > 0 ? product.sizes : [{ id: SIZELESS_KEY, label: product.unit }];
  const stocks = sizes.map((s) => product.stockByBranch[branchId]?.[s.id] ?? 0);
  const total = stocks.reduce((sum, n) => sum + n, 0);
  const anyOut = stocks.some((n) => n <= 0);
  const anyLow = !anyOut && stocks.some((n) => n <= product.lowStockThreshold);

  return (
    <motion.div variants={staggerItem}>
      <Card className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display font-bold text-ink">{product.name}</p>
              {anyOut ? (
                <Badge tone="danger">Algún tamaño agotado</Badge>
              ) : anyLow ? (
                <Badge tone="warning">Algún tamaño con stock bajo</Badge>
              ) : null}
            </div>
            <p className="text-sm text-ink-muted">
              {product.category}
              {sizes.length > 1 && ` · Total: ${total} ${product.unit}`}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {sizes.map((size) => (
            <SizeStockRow
              key={size.id}
              label={product.sizes.length > 0 ? size.label : null}
              stock={product.stockByBranch[branchId]?.[size.id] ?? 0}
              threshold={product.lowStockThreshold}
              unit={product.unit}
              onAdjust={(delta) => adjustStock(product.id, branchId, size.id, delta)}
              onSetStock={(val) => setStock(product.id, branchId, size.id, val)}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

/** Fila compacta de +/- y edición para UN tamaño dentro de ProductStockCard. */
function SizeStockRow({
  label,
  stock,
  threshold,
  unit,
  onAdjust,
  onSetStock,
}: {
  label: string | null;
  stock: number;
  threshold: number;
  unit: string;
  onAdjust: (delta: number) => void;
  onSetStock: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(stock.toString());

  const low = stock <= threshold;
  const out = stock <= 0;

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSetStock(parsed);
    } else {
      setInputValue(stock.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={cn('flex items-center gap-3 rounded-lg px-2.5 py-1.5', out ? 'bg-red-50 dark:bg-red-500/10' : low ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-cream-100 dark:bg-zinc-800/60')}>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
        {label ?? 'Stock'}
      </span>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onAdjust(-1)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cream-300 text-ink-muted hover:bg-cream-200 cursor-pointer dark:bg-zinc-700 dark:hover:bg-zinc-600"
      >
        <Minus size={14} />
      </motion.button>

      <div
        className="flex w-20 flex-shrink-0 items-center justify-end rounded-md px-1.5 py-1 hover:bg-white/50 cursor-pointer transition-colors dark:hover:bg-black/20"
        onClick={() => {
          setInputValue(stock.toString());
          setIsEditing(true);
        }}
      >
        {isEditing ? (
          <input
            type="number"
            min="0"
            autoFocus
            className={cn(
              'w-full bg-transparent text-right font-display text-base font-bold tabular-nums outline-none',
              low && 'text-amber-700',
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className={cn('text-right font-display text-base font-bold tabular-nums', low && 'text-amber-700')}>
            {stock} <span className="text-xs font-normal text-ink-soft">{unit}</span>
          </span>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onAdjust(1)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 hover:bg-secondary-200 cursor-pointer dark:bg-secondary-500/20 dark:hover:bg-secondary-500/30"
      >
        <Plus size={14} />
      </motion.button>
    </div>
  );
}

function StockRow({
  name,
  category,
  stock,
  threshold,
  unit,
  onAdjust,
  onSetStock,
}: {
  name: string;
  category: string;
  stock: number;
  threshold: number;
  unit: string;
  onAdjust: (delta: number) => void;
  onSetStock: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(stock.toString());

  const low = stock <= threshold;
  const out = stock <= 0;

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSetStock(parsed);
    } else {
      setInputValue(stock.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <motion.div variants={staggerItem}>
      <Card className="flex items-center gap-4 p-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display font-bold text-ink">{name}</p>
            {out ? (
              <Badge tone="danger">Agotado</Badge>
            ) : low ? (
              <Badge tone="warning">Stock bajo</Badge>
            ) : null}
          </div>
          <p className="text-sm text-ink-muted">{category}</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdjust(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-300 text-ink-muted hover:bg-cream-200 cursor-pointer"
          >
            <Minus size={16} />
          </motion.button>
          
          <div 
            className="flex w-24 items-center justify-end px-2 py-1 rounded-md hover:bg-cream-200 cursor-pointer transition-colors"
            onClick={() => {
              setInputValue(stock.toString());
              setIsEditing(true);
            }}
          >
            {isEditing ? (
              <input
                type="number"
                min="0"
                autoFocus
                className={cn(
                  "w-full bg-transparent text-right font-display text-lg font-bold tabular-nums outline-none",
                  low && 'text-amber-700'
                )}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <span className={cn('text-right font-display text-lg font-bold tabular-nums', low && 'text-amber-700')}>
                {stock} <span className="text-sm font-normal text-ink-soft">{unit}</span>
              </span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdjust(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 hover:bg-secondary-200 cursor-pointer"
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
}
