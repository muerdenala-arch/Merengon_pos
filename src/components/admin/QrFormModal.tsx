import { useEffect, useRef, useState } from 'react';
import { QrCode as QrCodeIcon, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, fieldLabelClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { fileToCompressedDataUrl } from '@/lib/image';
import type { QrCode } from '@/types';
import { cn } from '@/lib/utils';

interface QrFormModalProps {
  qr: QrCode | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = { alias: '', bankOrHolder: '', image: '' };

export function QrFormModal({ qr, open, onClose }: QrFormModalProps) {
  const addQrCode = useQrCodeStore((s) => s.addQrCode);
  const updateQrCode = useQrCodeStore((s) => s.updateQrCode);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (qr) {
      setForm({ alias: qr.alias, bankOrHolder: qr.bankOrHolder, image: qr.image });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [qr, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      // Más calidad que el comprobante de venta: este QR se escanea, debe verse nítido.
      const dataUrl = await fileToCompressedDataUrl(file, { maxWidth: 640, quality: 0.9 });
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch {
      setError('No se pudo cargar la imagen. Intenta de nuevo.');
    }
  }

  function handleSave() {
    if (!form.alias.trim() || !form.image) {
      setError('Falta el alias o la imagen del QR.');
      return;
    }
    const data = { alias: form.alias.trim(), bankOrHolder: form.bankOrHolder.trim(), image: form.image };
    if (qr) {
      updateQrCode(qr.id, data);
    } else {
      addQrCode(data);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={qr ? 'Editar QR' : 'Nuevo QR de cobro'} size="sm">
      <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
        <div>
          <p className={fieldLabelClasses}>Imagen del QR</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {form.image ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl2 border-2 border-secondary-300 bg-white cursor-pointer dark:border-secondary-600"
            >
              <img src={form.image} alt="QR" className="h-full w-full object-contain" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                Cambiar imagen
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-touch-lg w-full flex-col items-center justify-center gap-1.5 rounded-xl2 border-2 border-dashed border-border-strong bg-field px-4 py-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 cursor-pointer"
            >
              <Upload size={24} className="text-primary-500" />
              <span className="font-display text-sm font-bold text-ink">Subir imagen del QR</span>
              <span className="text-xs text-ink-soft">Desde archivo o cámara del dispositivo</span>
            </button>
          )}
        </div>

        <Input
          label="Alias de la cuenta"
          value={form.alias}
          onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
          placeholder="Ej. Cuenta Principal, Yape"
        />
        <Input
          label="Banco / Titular"
          value={form.bankOrHolder}
          onChange={(e) => setForm((f) => ({ ...f, bankOrHolder: e.target.value }))}
          placeholder="Ej. BMSC — Valeria Ríos"
        />

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <QrCodeIcon size={13} /> {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className={cn('flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700')}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-[2]" size="lg">
          {qr ? 'Guardar cambios' : 'Agregar QR'}
        </Button>
      </div>
    </Modal>
  );
}
