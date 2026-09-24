import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCatalogStore } from '@/store/catalogStore';
import type { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Marquee } from '@/components/ui/Marquee';

export function ProductRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const toggleActive = useCatalogStore((s) => s.toggleActive);
  const removeProduct = useCatalogStore((s) => s.removeProduct);
  const totalStock = Object.values(product.stockByBranch).reduce(
    (sum, sizes) => sum + Object.values(sizes).reduce((s, n) => s + n, 0),
    0,
  );
  const lowStock = totalStock <= product.lowStockThreshold;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="flex items-center gap-2 p-3.5 sm:gap-4">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="hidden h-14 w-14 flex-shrink-0 rounded-xl2 object-cover sm:block"
        />
      ) : (
        <div className={cn('hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl2 bg-gradient-to-br text-2xl sm:flex', product.gradient)}>
          {product.emoji}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Marquee as="p" className="font-display font-bold text-ink">{product.name}</Marquee>
          {!product.active && <Badge tone="neutral">Inactivo</Badge>}
          {lowStock && product.active && <Badge tone="warning">Stock bajo</Badge>}
        </div>
        <Marquee as="p" className="text-sm text-ink-muted">
          {product.category} · {formatCurrency(product.basePrice)} · Stock total: {totalStock}
        </Marquee>
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => toggleActive(product.id)}
        className={cn(
          'relative h-7 w-12 flex-shrink-0 rounded-full transition-colors cursor-pointer',
          product.active ? 'bg-secondary-500' : 'bg-cream-300',
        )}
        aria-label="Activar/desactivar"
      >
        {/* El "knob" se mantiene blanco en ambos temas (como en iOS/Android) para que
            siempre luzca "elevado" sobre el track de color. */}
        <motion.span
          layout
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: product.active ? '1.6rem' : '0.25rem' }}
        />
      </motion.button>

      <button
        onClick={onEdit}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-primary-50 hover:text-primary-700 cursor-pointer"
        aria-label="Editar"
      >
        <Pencil size={17} />
      </button>
      <button
        onClick={() => setConfirmDelete(true)}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"
        aria-label="Eliminar"
      >
        <Trash2 size={17} />
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Eliminar "${product.name}"?`}
        description="Esta acción no se puede deshacer. El producto dejará de aparecer en el catálogo y en el punto de venta."
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={() => removeProduct(product.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </Card>
  );
}
