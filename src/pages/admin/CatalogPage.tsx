import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { useCatalogStore } from '@/store/catalogStore';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ProductRow } from '@/components/admin/ProductRow';
import { Button } from '@/components/ui/Button';
import type { Product } from '@/types';
import { staggerContainer, staggerItem } from '@/lib/motion';

export default function CatalogPage() {
  const products = useCatalogStore((s) => s.products);
  const [editing, setEditing] = useState<Product | null | 'new'>(null);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Package size={24} className="text-primary-500" /> Catálogo de jugos
            </h1>
            <p className="text-sm text-ink-muted">Gestiona productos, tamaños, bases y agregados.</p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} /> Nuevo producto
          </Button>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
          {products.map((product) => (
            <motion.div key={product.id} variants={staggerItem}>
              <ProductRow product={product} onEdit={() => setEditing(product)} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <ProductFormModal
        product={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </AdminShell>
  );
}
