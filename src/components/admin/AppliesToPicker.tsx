import { useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { joinTargets, parseTargets } from '@/lib/appliesTo';
import { normalizeSearch } from '@/lib/search';
import { cn } from '@/lib/utils';
import { Marquee } from '@/components/ui/Marquee';

/** Selector "Aplica a" de promociones y cupones: se buscan productos escribiendo y cada clic
 *  los va agregando a la lista (se pueden juntar varios). Sin ninguno elegido aplica a todos.
 *  Ofrece exactamente los productos del Catálogo (sin los insumos que solo existen en Bodega). */
export function AppliesToPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const products = useCatalogStore((s) => s.products);
  const [query, setQuery] = useState('');

  // Mismo criterio que la pantalla Catálogo.
  const catalogProducts = useMemo(
    () =>
      products
        .filter((p) => !(p.branchIds.length > 0 && p.branchIds.every((b) => b === 'bodega')))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const targets = parseTargets(value).filter((t) => t !== 'ALL');
  const selected = new Set(targets);

  function labelOf(target: string): string {
    if (target.startsWith('PRODUCT:')) {
      return products.find((p) => p.id === target.slice(8))?.name ?? 'Producto eliminado';
    }
    if (target.startsWith('SIZE:')) {
      const [, productId, sizeId] = target.split(':');
      const product = products.find((p) => p.id === productId);
      const size = product?.sizes.find((s) => s.id === sizeId);
      return product && size ? `${product.name} - ${size.label}` : 'Producto eliminado';
    }
    return `Categoría ${target}`; // valor viejo (antes se podía elegir una categoría completa)
  }

  const q = normalizeSearch(query);
  const filtered = q
    ? catalogProducts.filter((p) => normalizeSearch(`${p.name} ${p.category}`).includes(q))
    : catalogProducts;

  function toggle(target: string) {
    onChange(joinTargets(selected.has(target) ? targets.filter((t) => t !== target) : [...targets, target]));
  }

  function addAllFiltered() {
    const extra = filtered.map((p) => `PRODUCT:${p.id}`).filter((t) => !selected.has(t));
    if (extra.length > 0) onChange(joinTargets([...targets, ...extra]));
  }

  return (
    <div className="rounded-xl border border-border bg-field p-2.5">
      {/* Lo que ya se eligió */}
      {targets.length === 0 ? (
        <p className="px-1 pb-2 text-sm font-semibold text-ink">Todos los productos</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {targets.map((t) => (
            <span
              key={t}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-500 py-1 pl-3 pr-1.5 text-xs font-semibold text-white"
            >
              <Marquee className="">{labelOf(t)}</Marquee>
              <button
                type="button"
                onClick={() => toggle(t)}
                aria-label={`Quitar ${labelOf(t)}`}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full hover:bg-white/25 cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange('ALL')}
            className="rounded-full px-2 py-1 text-xs font-semibold text-ink-muted hover:text-red-600 cursor-pointer"
          >
            Quitar todos
          </button>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe para buscar y toca para agregar..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-ink focus:border-primary-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Borrar búsqueda"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-cream-300 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {q && filtered.length > 1 && (
        <button
          type="button"
          onClick={addAllFiltered}
          className="mt-1.5 flex items-center gap-1 px-1 text-xs font-semibold text-primary-600 hover:underline cursor-pointer"
        >
          <Plus size={13} /> Agregar los {filtered.length} resultados
        </button>
      )}

      {/* Lista de productos del catálogo */}
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg bg-surface">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-ink-muted">Ningún producto coincide.</p>
        ) : (
          filtered.map((p) => {
            const target = `PRODUCT:${p.id}`;
            const on = selected.has(target);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(target)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0 cursor-pointer',
                  on ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink hover:bg-cream-200',
                )}
              >
                <Marquee className="flex-1">
                  {p.name}
                  <span className="ml-1.5 text-xs font-normal text-ink-soft">({p.category})</span>
                </Marquee>
                <span
                  className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                    on ? 'border-primary-500 bg-primary-500 text-white' : 'border-border-strong text-transparent',
                  )}
                >
                  <Check size={12} />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
