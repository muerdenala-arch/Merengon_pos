import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCatalogStore } from '@/store/catalogStore';
import { useBranchStore } from '@/store/branchStore';
import type { Topping } from '@/types';

interface ToppingFormModalProps {
  topping: Topping | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  name: '',
  priceExtra: '0',
  stock: '30',
  lowStockThreshold: '8',
};

export function ToppingFormModal({ topping, open, onClose }: ToppingFormModalProps) {
  const upsertTopping = useCatalogStore((s) => s.upsertTopping);
  const createTopping = useCatalogStore((s) => s.createTopping);
  const branches = useBranchStore((s) => s.branches);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (topping) {
      setForm({
        name: topping.name,
        priceExtra: String(topping.priceExtra),
        stock: '0',
        lowStockThreshold: String(topping.lowStockThreshold),
      });
    } else {
      setForm(emptyForm);
    }
  }, [topping, open]);

  function handleSave() {
    if (!form.name.trim()) return;
    const stockByBranch = topping
      ? topping.stockByBranch
      : Object.fromEntries(branches.map((b) => [b.id, Number(form.stock) || 0]));

    const base = {
      name: form.name.trim(),
      priceExtra: Number(form.priceExtra) || 0,
      stockByBranch,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
    };

    if (topping) {
      upsertTopping({ ...base, id: topping.id });
    } else {
      createTopping(base);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={topping ? 'Editar topping' : 'Nuevo topping / agregado'}
      size="sm"
    >
      <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
        <Input
          label="Nombre del topping"
          placeholder="Ej. Nutella, Oreo triturada, Chantilly..."
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        {!topping && (
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
          className="flex-[2] !bg-secondary-500 py-3 !text-white !shadow-lg hover:!bg-secondary-600"
          size="lg"
          disabled={!form.name.trim()}
        >
          {topping ? 'Guardar cambios' : 'Crear topping'}
        </Button>
      </div>
    </Modal>
  );
}
