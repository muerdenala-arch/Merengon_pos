import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { normalizeSearch } from '@/lib/search';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  hint?: string;
  group: 'Todos' | 'Categorías completas' | 'Productos' | 'Tamaños';
}

const GROUP_ORDER: Option['group'][] = ['Todos', 'Categorías completas', 'Productos', 'Tamaños'];

/** Selector "Aplica a" de promociones y cupones, con buscador: al escribir se van filtrando
 *  los productos por nombre. Solo ofrece lo que se vende (catálogo / sucursales) — los
 *  insumos que existen únicamente en Bodega no aparecen. */
export function AppliesToPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const products = useCatalogStore((s) => s.products);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const options = useMemo<Option[]>(() => {
    const sellable = products.filter((p) => p.branchIds.some((b) => b !== 'bodega'));
    const list: Option[] = [{ value: 'ALL', label: 'Todos los productos', group: 'Todos' }];

    const cats = Array.from(new Set(sellable.map((p) => p.category))).sort((a, b) => a.localeCompare(b));
    for (const c of cats) list.push({ value: c, label: c, group: 'Categorías completas' });

    for (const p of [...sellable].sort((a, b) => a.name.localeCompare(b.name))) {
      list.push({ value: `PRODUCT:${p.id}`, label: p.name, hint: p.category, group: 'Productos' });
    }
    for (const p of sellable) {
      for (const s of p.sizes) {
        list.push({ value: `SIZE:${p.id}:${s.id}`, label: `${p.name} - ${s.label}`, hint: p.category, group: 'Tamaños' });
      }
    }
    return list;
  }, [products]);

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected
    ? selected.group === 'Categorías completas'
      ? `Categoría: ${selected.label}`
      : selected.label
    : value; // valor viejo que ya no está en la lista (producto borrado o solo de bodega)

  const q = normalizeSearch(query);
  const filtered = q
    ? options.filter((o) => o.group !== 'Todos' && normalizeSearch(`${o.label} ${o.hint ?? ''}`).includes(q))
    : options;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-field px-3 py-2.5 text-left text-sm text-ink focus:border-primary-400 focus:outline-none cursor-pointer"
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="flex-shrink-0 text-xs font-semibold text-primary-600">{open ? 'Cerrar' : 'Cambiar'}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface p-2 shadow-soft">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe el nombre del producto..."
              className="w-full rounded-lg border border-border bg-field py-2 pl-9 pr-9 text-sm text-ink focus:border-primary-400 focus:outline-none"
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

          <div className="mt-2 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-ink-muted">Ningún producto coincide.</p>
            ) : (
              GROUP_ORDER.map((group) => {
                const items = filtered.filter((o) => o.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    {group !== 'Todos' && (
                      <p className="sticky top-0 bg-surface px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                        {group}
                      </p>
                    )}
                    {items.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => pick(o.value)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer',
                          o.value === value ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink hover:bg-cream-200',
                        )}
                      >
                        <span className="min-w-0 truncate">
                          {o.label}
                          {o.hint && <span className="ml-1.5 text-xs text-ink-soft">({o.hint})</span>}
                        </span>
                        {o.value === value && <Check size={15} className="flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
