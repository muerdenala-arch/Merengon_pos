import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, Minus, Plus } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCatalogStore } from '@/store/catalogStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const products = useCatalogStore((s) => s.products);
  const toppings = useCatalogStore((s) => s.toppings);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const adjustToppingStock = useCatalogStore((s) => s.adjustToppingStock);

  const lowStockCount =
    products.filter((p) => p.stock <= p.lowStockThreshold).length +
    toppings.filter((t) => t.stock <= t.lowStockThreshold).length;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Boxes size={24} className="text-primary-500" /> Inventario
          </h1>
          <p className="text-sm text-ink-muted">Control básico de existencias de productos y agregados.</p>
          {lowStockCount > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
              <AlertTriangle size={16} />
              {lowStockCount} ítem{lowStockCount > 1 ? 's' : ''} con stock bajo
            </div>
          )}
        </div>

        <h2 className="mb-3 font-display text-lg font-bold text-ink">Productos</h2>
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-8 space-y-2.5">
          {products.map((product) => (
            <StockRow
              key={product.id}
              name={product.name}
              category={product.category}
              stock={product.stock}
              threshold={product.lowStockThreshold}
              unit={product.unit}
              onAdjust={(delta) => adjustStock(product.id, delta)}
            />
          ))}
        </motion.div>

        <h2 className="mb-3 font-display text-lg font-bold text-ink">Agregados / Toppings</h2>
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
          {toppings.map((topping) => (
            <StockRow
              key={topping.id}
              name={topping.name}
              category="Topping"
              stock={topping.stock}
              threshold={topping.lowStockThreshold}
              unit="porciones"
              onAdjust={(delta) => adjustToppingStock(topping.id, delta)}
            />
          ))}
        </motion.div>
      </div>
    </AdminShell>
  );
}

function StockRow({
  name,
  category,
  stock,
  threshold,
  unit,
  onAdjust,
}: {
  name: string;
  category: string;
  stock: number;
  threshold: number;
  unit: string;
  onAdjust: (delta: number) => void;
}) {
  const low = stock <= threshold;
  const out = stock <= 0;

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
          <span className={cn('w-14 text-center font-display text-lg font-bold tabular-nums', low && 'text-amber-700')}>
            {stock} {unit === 'porciones' ? '' : unit}
          </span>
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
