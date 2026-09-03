import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/Button';

import { cn, formatCurrency } from '@/lib/utils';

interface CartPanelProps {
  onCheckout: () => void;
  /** 'sidebar' (escritorio, con borde izquierdo) o 'drawer' (bottom sheet en móvil). */
  variant?: 'sidebar' | 'drawer';
}

export function CartPanel({ onCheckout, variant = 'sidebar' }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-surface', variant === 'sidebar' && 'border-l border-border')}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <ShoppingCart size={20} className="text-primary-500" />
          Orden actual
        </h2>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-xs font-semibold text-ink-soft hover:text-red-600 cursor-pointer"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* min-h-0 es lo que permite que esta lista se encoja y haga scroll propio en vez de
          empujar el footer (Total + Cobrar) fuera del área visible — un flex item con flex-1
          conserva `min-height:auto` por defecto y crece con el contenido si no se anula. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pr-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.lineId}
              layout
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3 overflow-hidden rounded-xl2 bg-cream-100 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{item.product.name}</p>
                  <p className="text-xs text-ink-muted">
                  {item.modifiers.size?.label}

                  </p>
                  {item.modifiers.toppings.length > 0 && (
                    <p className="text-xs text-secondary-700">
                      + {item.modifiers.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                  {item.notes && <p className="text-xs italic text-ink-soft">"{item.notes}"</p>}
                </div>
                <button
                  onClick={() => removeItem(item.lineId)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  aria-label="Quitar"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
                  >
                    <Minus size={13} />
                  </motion.button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
                  >
                    <Plus size={13} />
                  </motion.button>
                </div>
                <span className="font-display text-sm font-bold text-primary-600">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center text-ink-soft">
            <ShoppingCart size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Toca un producto para agregarlo</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-muted">Total ({count} ítems)</span>
          <span className="font-display text-2xl font-extrabold text-ink tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
        <Button size="lg" className="w-full" disabled={items.length === 0} onClick={onCheckout}>
          Cobrar
        </Button>
      </div>
    </div>
  );
}
