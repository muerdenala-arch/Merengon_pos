import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, PackageX, PackageSearch } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { useBranchStore } from '@/store/branchStore';
import { SIZELESS_KEY } from '@/types';
import { cn } from '@/lib/utils';

interface LowStockItem {
  key: string;
  /** Id del producto/topping — la pantalla destino lo marca al llegar. */
  refId: string;
  name: string;
  kind: 'Producto' | 'Topping';
  branchId: string;
  branchName: string;
  stock: number;
  threshold: number;
}

function useLowStockItems(): LowStockItem[] {
  const products = useCatalogStore((s) => s.products);
  const toppings = useCatalogStore((s) => s.toppings);
  const branches = useBranchStore((s) => s.branches);

  return useMemo(() => {
    const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
    const items: LowStockItem[] = [];

    for (const p of products) {
      for (const branchId of p.branchIds) {
        const sizesToCheck = p.sizes.length > 0 ? p.sizes : [{ id: SIZELESS_KEY, label: '' }];
        for (const size of sizesToCheck) {
          const stock = p.stockByBranch[branchId]?.[size.id] ?? 0;
          if (stock <= p.lowStockThreshold) {
            items.push({
              key: `p-${p.id}-${branchId}-${size.id}`,
              refId: p.id,
              // Con varios tamaños, aclarar cuál para que el admin sepa qué reponer.
              name: p.sizes.length > 0 ? `${p.name} (${size.label})` : p.name,
              kind: 'Producto',
              branchId,
              branchName: branchName(branchId),
              stock,
              threshold: p.lowStockThreshold,
            });
          }
        }
      }
    }
    for (const t of toppings) {
      for (const branchId of t.branchIds) {
        const stock = t.stockByBranch[branchId] ?? 0;
        if (stock <= t.lowStockThreshold) {
          items.push({
            key: `t-${t.id}-${branchId}`,
            refId: t.id,
            name: t.name,
            kind: 'Topping',
            branchId,
            branchName: branchName(branchId),
            stock,
            threshold: t.lowStockThreshold,
          });
        }
      }
    }
    // Agotados primero, luego por menor stock.
    return items.sort((a, b) => a.stock - b.stock);
  }, [products, toppings, branches]);
}

/** Campana de alertas de stock para el panel admin — agrupa productos/toppings con stock
 *  bajo o agotado en CUALQUIER sucursal (incluida bodega) y deja saltar directo a la
 *  pantalla donde se puede reponer (Bodega Central o Inventario, ya filtrado a la
 *  sucursal correcta). */
export function LowStockAlertBell() {
  const items = useLowStockItems();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setAdminFilterBranchId = useBranchStore((s) => s.setAdminFilterBranchId);

  function goTo(item: LowStockItem) {
    setOpen(false);
    if (item.branchId === 'bodega') {
      navigate('/admin/bodega', { state: { highlightId: item.refId } });
    } else {
      setAdminFilterBranchId(item.branchId);
      navigate('/admin/inventario', { state: { highlightId: item.refId } });
    }
  }

  const outCount = items.filter((i) => i.stock <= 0).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Alertas de stock"
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
      >
        <Bell size={19} />
        {items.length > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm',
              outCount > 0 ? 'bg-red-500' : 'bg-amber-500',
            )}
          >
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 max-w-[85vw] overflow-hidden rounded-xl2 border border-border bg-surface shadow-card"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="font-display font-bold text-ink">Alertas de stock</p>
                <p className="text-xs text-ink-muted">
                  {items.length === 0
                    ? 'Todo el stock está en orden'
                    : `${items.length} ítem${items.length !== 1 ? 's' : ''} con stock bajo o agotado`}
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <PackageSearch size={26} className="text-ink-soft" />
                    <p className="text-sm text-ink-muted">No hay nada urgente por reponer.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={item.key} className="flex items-center gap-2 px-4 py-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                            item.stock <= 0
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                          )}
                        >
                          <PackageX size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                          <p className="text-xs text-ink-muted">
                            {item.kind} · {item.branchName} ·{' '}
                            {item.stock <= 0 ? 'Agotado' : `Quedan ${item.stock}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => goTo(item)}
                          className="flex-shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-600 cursor-pointer"
                        >
                          Ver
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
