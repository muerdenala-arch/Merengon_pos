import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fieldClasses } from '@/components/ui/Input';
import { optionActiveClasses, optionInactiveClasses } from '@/lib/optionStyles';
import { useCatalogStore } from '@/store/catalogStore';
import { useCartStore } from '@/store/cartStore';
import { BASE_LIQUIDA_LABEL, NIVEL_AZUCAR_LABEL } from '@/types';
import type { BaseLiquida, CartModifiers, NivelAzucar, Product, Topping } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface ModifierModalProps {
  product: Product | null;
  branchId: string;
  onClose: () => void;
}

const SUGAR_LEVELS: NivelAzucar[] = ['sin_azucar', 'poco', 'normal', 'extra'];

export function ModifierModal({ product, branchId, onClose }: ModifierModalProps) {
  const toppingsCatalog = useCatalogStore((s) => s.toppings);
  const addItem = useCartStore((s) => s.addItem);

  const [sizeId, setSizeId] = useState(product?.sizes[0]?.id ?? '');
  const [baseLiquida, setBaseLiquida] = useState<BaseLiquida | null>(null);
  const [sugarLevel, setSugarLevel] = useState<NivelAzucar | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const availableToppings = useMemo(
    () => toppingsCatalog.filter((t) => product?.toppingIds.includes(t.id)),
    [toppingsCatalog, product],
  );

  if (!product) return null;

  const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const toppings: Topping[] = availableToppings.filter((t) => selectedToppings.includes(t.id));
  const toppingsTotal = toppings.reduce((sum, t) => sum + t.priceExtra, 0);
  const unitPrice = product.basePrice + size.priceDelta + toppingsTotal;
  const lineTotal = unitPrice * quantity;

  function toggleTopping(id: string) {
    setSelectedToppings((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleReset() {
    setSizeId(product!.sizes[0]?.id ?? '');
    setBaseLiquida(null);
    setSugarLevel(null);
    setSelectedToppings([]);
    setQuantity(1);
    setNotes('');
  }

  function handleAdd() {
    const modifiers: CartModifiers = { size, baseLiquida, sugarLevel, toppings };
    addItem(product!, modifiers, quantity, notes || undefined);
    handleReset();
    onClose();
  }

  return (
    <Modal open={!!product} onClose={onClose} title={product.name} size="lg">
      <div className="px-6 pb-6 pt-4">
        <div className={cn('mb-5 flex items-center gap-4 rounded-xl2 bg-gradient-to-br p-4 text-white', product.gradient)}>
          <span className="text-4xl">{product.emoji}</span>
          <div>
            <p className="text-sm opacity-90">{product.description}</p>
            <p className="font-display text-lg font-bold">{formatCurrency(product.basePrice)} base</p>
          </div>
        </div>

        <Section title="Tamaño">
          <div className="grid grid-cols-3 gap-2.5">
            {product.sizes.map((s) => (
              <OptionPill key={s.id} active={s.id === sizeId} onClick={() => setSizeId(s.id)}>
                <span className="font-semibold">{s.label}</span>
                <span className="text-xs opacity-75">{s.ounces}oz</span>
                {s.priceDelta > 0 && <span className="text-xs opacity-75">+{formatCurrency(s.priceDelta)}</span>}
              </OptionPill>
            ))}
          </div>
        </Section>

        {product.baseLiquidaOptions.length > 0 && (
          <Section title="Base líquida">
            <div className="flex flex-wrap gap-2.5">
              {product.baseLiquidaOptions.map((b) => (
                <OptionPill key={b} active={baseLiquida === b} onClick={() => setBaseLiquida(b)} compact>
                  {BASE_LIQUIDA_LABEL[b]}
                </OptionPill>
              ))}
            </div>
          </Section>
        )}

        {product.allowSugarLevel && (
          <Section title="Nivel de azúcar">
            <div className="flex flex-wrap gap-2.5">
              {SUGAR_LEVELS.map((lvl) => (
                <OptionPill key={lvl} active={sugarLevel === lvl} onClick={() => setSugarLevel(lvl)} compact>
                  {NIVEL_AZUCAR_LABEL[lvl]}
                </OptionPill>
              ))}
            </div>
          </Section>
        )}

        {availableToppings.length > 0 && (
          <Section title="Agregados / Toppings">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {availableToppings.map((t) => {
                const outOfStock = (t.stockByBranch[branchId] ?? 0) <= 0;
                const active = selectedToppings.includes(t.id);
                return (
                  <button
                    key={t.id}
                    disabled={outOfStock}
                    onClick={() => toggleTopping(t.id)}
                    className={cn(
                      'flex min-h-touch items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                      active ? optionActiveClasses : optionInactiveClasses,
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {active && <Check size={15} />}
                      {t.name}
                    </span>
                    <span className={cn('text-xs', active ? 'text-white/90' : 'text-zinc-500 dark:text-zinc-400')}>
                      +{formatCurrency(t.priceExtra)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <Section title="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. sin hielo, para llevar..."
            rows={2}
            className={cn(fieldClasses, 'text-sm')}
          />
        </Section>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl2 bg-cream-200 p-3">
          <span className="text-sm font-semibold text-ink-muted">Cantidad</span>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
            >
              <Minus size={16} />
            </motion.button>
            <span className="w-6 text-center font-display text-lg font-bold">{quantity}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancelar
        </Button>
        <Button onClick={handleAdd} className="flex-[2]" size="lg">
          Agregar · {formatCurrency(lineTotal)}
        </Button>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">{title}</p>
      {children}
    </div>
  );
}

function OptionPill({
  active,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-touch cursor-pointer flex-col items-center justify-center rounded-xl border-2 text-sm transition-colors',
        compact ? 'px-4 py-2' : 'px-2 py-2.5',
        active ? optionActiveClasses : optionInactiveClasses,
      )}
    >
      {children}
    </button>
  );
}
