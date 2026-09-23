import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useBranchStore } from '@/store/branchStore';
import type { Branch } from '@/types';
import { cn } from '@/lib/utils';

interface BranchFormModalProps {
  branch: Branch | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = { name: '', address: '', phone: '', cashAuditDays: 7 };

const AUDIT_PRESETS = [
  { days: 1, label: 'Diario' },
  { days: 7, label: 'Semanal' },
  { days: 30, label: 'Mensual' },
];

export function BranchFormModal({ branch, open, onClose }: BranchFormModalProps) {
  const addBranch = useBranchStore((s) => s.addBranch);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(
      branch
        ? { name: branch.name, address: branch.address, phone: branch.phone, cashAuditDays: branch.cashAuditDays ?? 7 }
        : emptyForm,
    );
  }, [branch, open]);

  function handleSave() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      cashAuditDays: Math.max(1, Number(form.cashAuditDays) || 7),
    };
    if (branch) {
      updateBranch(branch.id, data);
    } else {
      addBranch(data);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={branch ? 'Editar sucursal' : 'Nueva sucursal'} size="sm">
      <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Sucursal Este" />
        <Input
          label="Dirección"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Ej. Av. Siempre Viva 742"
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Ej. 700-00004"
        />

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Auditoría de caja cada
          </label>
          <p className="mb-2 text-xs text-ink-muted">
            Cada cuántos días el administrador de esta sucursal cierra y revisa la caja. El
            sistema avisa (y bloquea abrir una caja nueva) si queda una sin cerrar por más
            tiempo del que elijas acá — cada sucursal puede tener su propio ritmo.
          </p>
          <div className="mb-2 flex gap-2">
            {AUDIT_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setForm((f) => ({ ...f, cashAuditDays: preset.days }))}
                className={cn(
                  'flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-colors cursor-pointer',
                  form.cashAuditDays === preset.days
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10'
                    : 'border-border text-ink-muted hover:border-primary-200',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={1}
            label="O un número de días personalizado"
            value={String(form.cashAuditDays)}
            onChange={(e) => setForm((f) => ({ ...f, cashAuditDays: Number(e.target.value) || 1 }))}
          />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className={cn('flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700')}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-[2]" size="lg" disabled={!form.name.trim()}>
          {branch ? 'Guardar cambios' : 'Crear sucursal'}
        </Button>
      </div>
    </Modal>
  );
}
