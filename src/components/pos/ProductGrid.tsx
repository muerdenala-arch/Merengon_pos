import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import type { Product } from '@/types';
import { staggerContainer, staggerItem, cardHover } from '@/lib/motion';
import { cn, formatCurrency } from '@/lib/utils';
import { fieldClasses } from '@/components/ui/Input';

interface ProductGridProps {
  onSelect: (product: Product) => void;
}

export function ProductGrid({ onSelect }: ProductGridProps) {
  const products = useCatalogStore((s) => s.products);
  const [category, setCategory] = useState<string>('Todos');
  const [query, setQuery] = useState('');

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (!p.active) return false;
        if (category !== 'Todos' && p.category !== category) return false;
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [products, category, query],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugo..."
            className={cn(fieldClasses, 'min-h-touch pl-10')}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
                category === c ? 'bg-primary-500 text-white' : 'bg-cream-300 text-ink-muted hover:bg-cream-200',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* min-h-0: sin esto, el grid de productos no se encoge y "empuja" la fila completa
          (incluida la columna del carrito) más allá de h-full al cambiar de categoría. */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelect} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-ink-soft">No se encontraron productos.</p>
        )}
      </motion.div>
    </div>
  );
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const lowStock = product.stock <= product.lowStockThreshold;
  const outOfStock = product.stock <= 0;

  return (
    <motion.button
      variants={staggerItem}
      {...cardHover}
      disabled={outOfStock}
      onClick={() => onSelect(product)}
      className="group relative flex flex-col overflow-hidden rounded-xl2 bg-surface text-left shadow-soft transition-shadow hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      <div className={cn('flex h-24 items-center justify-center bg-gradient-to-br text-4xl sm:h-28', product.gradient)}>
        {product.emoji}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="font-display text-sm font-bold leading-tight text-ink sm:text-base">{product.name}</p>
        <p className="text-xs text-ink-muted line-clamp-1">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="font-display text-base font-bold text-primary-600">
            {formatCurrency(product.basePrice)}
          </span>
          {outOfStock ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Agotado</span>
          ) : lowStock ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Quedan {product.stock}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
