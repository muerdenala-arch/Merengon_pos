import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Pencil, Trash2, Zap, ZoomIn } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { QrCode } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import { staggerItem } from '@/lib/motion';

interface QrCardProps {
  qr: QrCode;
  branchName?: string;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function QrCard({ qr, branchName, onActivate, onEdit, onDelete }: QrCardProps) {
  const [viewing, setViewing] = useState(false);

  return (
    <motion.div variants={staggerItem}>
      <Card
        className={cn(
          'flex flex-col overflow-hidden transition-shadow',
          qr.active && 'border-secondary-400 shadow-card dark:shadow-glow-secondary',
        )}
      >
        {qr.active && (
          <div className="flex items-center justify-center gap-1.5 bg-secondary-500 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
            <Zap size={12} /> Activo en caja
          </div>
        )}

        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label={`Ver el QR de ${qr.alias} en grande`}
          className="group relative flex items-center justify-center bg-white p-4 cursor-zoom-in dark:bg-zinc-100"
        >
          <img src={qr.image} alt={qr.alias} className="h-32 w-32 object-contain" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <ZoomIn size={22} className="text-white" />
          </span>
        </button>

        <Modal open={viewing} onClose={() => setViewing(false)} title={qr.alias} size="sm">
          <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-2">
            <div className="overflow-hidden rounded-xl2 border border-border bg-white p-4 dark:bg-zinc-100">
              <img src={qr.image} alt={qr.alias} className="max-h-[60vh] w-full max-w-sm object-contain" />
            </div>
            {qr.bankOrHolder && <p className="text-sm font-semibold text-ink-muted">{qr.bankOrHolder}</p>}
          </div>
        </Modal>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <p className="truncate font-display font-bold text-ink">{qr.alias}</p>
            <p className="truncate text-sm text-ink-muted">{qr.bankOrHolder || 'Sin banco/titular'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={qr.active ? 'secondary' : 'neutral'}>{qr.active ? 'Activo' : 'Inactivo'}</Badge>
            {branchName && <Badge tone="primary">{branchName}</Badge>}
          </div>

          <p className="text-xs text-ink-soft">Subido el {formatDateTime(qr.createdAt)}</p>

          <div className="mt-auto flex items-center gap-2 pt-2">
            {qr.active ? (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary-50 py-2.5 text-sm font-bold text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-400">
                <CheckCircle2 size={15} /> En uso
              </span>
            ) : (
              <button
                onClick={onActivate}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-600 cursor-pointer dark:shadow-glow-primary"
              >
                <Zap size={15} /> Activar para cobros
              </button>
            )}
            <button
              onClick={onEdit}
              aria-label="Editar"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-primary-50 hover:text-primary-700 cursor-pointer"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Eliminar"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
