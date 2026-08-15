import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, fieldClasses, fieldLabelClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { optionActiveClasses, optionInactiveClasses } from '@/lib/optionStyles';
import { useCatalogStore } from '@/store/catalogStore';
import { useBranchStore } from '@/store/branchStore';
import { SIZES, CATEGORIES } from '@/data/seed';
import { BASE_LIQUIDA_LABEL } from '@/types';
import type { BaseLiquida, Product } from '@/types';
import { cn } from '@/lib/utils';

interface ProductFormModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const ALL_BASE_LIQUIDA: BaseLiquida[] = ['agua', 'leche', 'leche_almendras', 'yogurt'];
const EMOJI_OPTIONS = ['🍹', '🥭', '🍍', '🍓', '🥝', '🍉', '🍋', '🍏', '🫐', '🍊', '🍇'];
const GRADIENT_OPTIONS = [
  'from-orange-400 to-amber-500',
  'from-lime-400 to-emerald-500',
  'from-pink-400 to-rose-500',
  'from-yellow-300 to-orange-400',
  'from-fuchsia-400 to-pink-500',
  'from-emerald-400 to-teal-500',
];

const emptyForm = {
  name: '',
  category: CATEGORIES[0] ?? 'Jugos Naturales',
  description: '',
  basePrice: '10',
  stock: '20',
  lowStockThreshold: '8',
  emoji: EMOJI_OPTIONS[0],
  gradient: GRADIENT_OPTIONS[0],
  allowSugarLevel: true,
  baseLiquidaOptions: ['agua'] as BaseLiquida[],
  toppingIds: [] as string[],
};

export function ProductFormModal({ product, open, onClose }: ProductFormModalProps) {
  const toppings = useCatalogStore((s) => s.toppings);
  const upsertProduct = useCatalogStore((s) => s.upsertProduct);
  const createProduct = useCatalogStore((s) => s.createProduct);
  const branches = useBranchStore((s) => s.branches);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        description: product.description,
        basePrice: String(product.basePrice),
        stock: '0',
        lowStockThreshold: String(product.lowStockThreshold),
        emoji: product.emoji,
        gradient: product.gradient,
        allowSugarLevel: product.allowSugarLevel,
        baseLiquidaOptions: product.baseLiquidaOptions,
        toppingIds: product.toppingIds,
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, open]);

  function toggleBase(base: BaseLiquida) {
    setForm((f) => ({
      ...f,
      baseLiquidaOptions: f.baseLiquidaOptions.includes(base)
        ? f.baseLiquidaOptions.filter((b) => b !== base)
        : [...f.baseLiquidaOptions, base],
    }));
  }

  function toggleTopping(id: string) {
    setForm((f) => ({
      ...f,
      toppingIds: f.toppingIds.includes(id) ? f.toppingIds.filter((t) => t !== id) : [...f.toppingIds, id],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const stockByBranch = product
      ? product.stockByBranch
      : Object.fromEntries(branches.map((b) => [b.id, Number(form.stock) || 0]));
    const base = {
      name: form.name.trim(),
      category: form.category,
      description: form.description,
      basePrice: Number(form.basePrice) || 0,
      gradient: form.gradient,
      emoji: form.emoji,
      sizes: SIZES,
      baseLiquidaOptions: form.baseLiquidaOptions,
      allowSugarLevel: form.allowSugarLevel,
      toppingIds: form.toppingIds,
      active: product?.active ?? true,
      stockByBranch,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      unit: 'porciones',
    };
    if (product) {
      upsertProduct({ ...base, id: product.id });
    } else {
      createProduct(base);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <div className="grid grid-cols-1 gap-5 px-6 pb-6 pt-2 sm:grid-cols-2">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

        <label className="flex flex-col">
          <span className={fieldLabelClasses}>Categoría</span>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className={cn(fieldClasses, 'min-h-touch')}
          >
            {[...new Set([...CATEGORIES, form.category])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <label className="flex flex-col">
            <span className={fieldLabelClasses}>Descripción</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={cn(fieldClasses, 'text-sm')}
            />
          </label>
        </div>

        <Input
          label="Precio base"
          type="number"
          min={0}
          step={0.5}
          value={form.basePrice}
          onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
        />
        {product ? (
          <div>
            <p className={fieldLabelClasses}>Stock</p>
            <p className="flex min-h-touch items-center rounded-xl border border-border-strong bg-field px-4 text-sm text-ink-muted">
              Se ajusta por sucursal desde Inventario.
            </p>
          </div>
        ) : (
          <Input
            label="Stock inicial (todas las sucursales)"
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
          />
        )}
        <Input
          label="Umbral de stock bajo"
          type="number"
          min={0}
          value={form.lowStockThreshold}
          onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
        />

        <div className="flex items-center gap-3">
          <span className={cn(fieldLabelClasses, 'mb-0')}>Permite nivel de azúcar</span>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, allowSugarLevel: !f.allowSugarLevel }))}
            className={cn(
              'relative h-7 w-12 flex-shrink-0 rounded-full transition-colors cursor-pointer',
              form.allowSugarLevel ? 'bg-secondary-500' : 'bg-zinc-300 dark:bg-zinc-700',
            )}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: form.allowSugarLevel ? '1.6rem' : '0.25rem' }}
            />
          </button>
        </div>

        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Ícono</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl border text-xl cursor-pointer transition-colors',
                  form.emoji === e
                    ? 'border-transparent bg-amber-500/10 ring-2 ring-amber-500'
                    : 'border-zinc-300 bg-zinc-50 hover:border-amber-300 dark:border-zinc-700 dark:bg-zinc-800',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Color de tarjeta</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {GRADIENT_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm((f) => ({ ...f, gradient: g }))}
                aria-label={g}
                className={cn(
                  'h-11 rounded-xl bg-gradient-to-br cursor-pointer border-2 transition-all',
                  g,
                  form.gradient === g ? 'border-white ring-2 ring-amber-500 scale-105 dark:border-zinc-900' : 'border-transparent',
                )}
              />
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Bases líquidas disponibles</p>
          <div className="flex flex-wrap gap-2">
            {ALL_BASE_LIQUIDA.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBase(b)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                  form.baseLiquidaOptions.includes(b) ? optionActiveClasses : optionInactiveClasses,
                )}
              >
                {BASE_LIQUIDA_LABEL[b]}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Agregados / toppings disponibles</p>
          <div className="flex flex-wrap gap-2">
            {toppings.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTopping(t.id)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                  form.toppingIds.includes(t.id) ? optionActiveClasses : optionInactiveClasses,
                )}
              >
                {t.name}
              </button>
            ))}
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
        <Button
          onClick={handleSave}
          className="flex-[2] !bg-amber-500 py-3 !text-white !shadow-lg hover:!bg-amber-600"
          size="lg"
          disabled={!form.name.trim()}
        >
          Guardar producto
        </Button>
      </div>
    </Modal>
  );
}
