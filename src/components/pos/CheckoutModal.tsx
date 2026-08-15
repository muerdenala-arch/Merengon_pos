import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Banknote, CheckCircle2, QrCode, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { cn, formatCurrency, uid } from '@/lib/utils';
import { APP_CONFIG } from '@/config/app';
import type { Payment, PaymentMethod } from '@/types';

interface CheckoutModalProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payment: Payment) => void;
}

const QUICK_ADD = [5, 10, 20, 50];
const QR_EXPIRY_SECONDS = 120;

export function CheckoutModal({ open, total, onClose, onConfirm }: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [cashInput, setCashInput] = useState('');
  const [qrRef, setQrRef] = useState('');
  const [qrPaid, setQrPaid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);

  useEffect(() => {
    if (open) {
      setMethod('efectivo');
      setCashInput('');
      setQrPaid(false);
      setQrRef(uid('qr').toUpperCase());
      setSecondsLeft(QR_EXPIRY_SECONDS);
    }
  }, [open, total]);

  useEffect(() => {
    if (!open || method !== 'qr' || qrPaid) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, method, qrPaid, secondsLeft]);

  const cashReceived = Number(cashInput || 0);
  const change = Math.max(0, cashReceived - total);
  const insufficientCash = cashReceived < total;

  const qrPayload = useMemo(
    () =>
      JSON.stringify({
        merchant: APP_CONFIG.storeName,
        ref: qrRef,
        amount: total.toFixed(2),
        currency: APP_CONFIG.currency,
        ts: Date.now(),
      }),
    [qrRef, total],
  );

  function handleQuickAdd(amount: number) {
    setCashInput(String((cashReceived + amount).toFixed(2).replace(/\.00$/, '')));
  }

  function handleExact() {
    setCashInput(String(total));
  }

  function regenerateQr() {
    setQrRef(uid('qr').toUpperCase());
    setSecondsLeft(QR_EXPIRY_SECONDS);
    setQrPaid(false);
  }

  function handleConfirm() {
    if (method === 'efectivo') {
      onConfirm({ method: 'efectivo', amount: total, cashReceived, change });
    } else {
      onConfirm({ method: 'qr', amount: total, qrRef });
    }
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Modal open={open} onClose={onClose} title="Cobrar" size="md">
      <div className="px-6 pb-6 pt-2">
        <div className="mb-5 rounded-xl2 bg-gradient-to-br from-primary-500 to-accent-500 p-4 text-center text-white shadow-pop">
          <p className="text-sm opacity-90">Total a pagar</p>
          <p className="font-display text-4xl font-extrabold tabular-nums">{formatCurrency(total)}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <MethodTab
            active={method === 'efectivo'}
            icon={<Banknote size={18} />}
            label="Efectivo"
            onClick={() => setMethod('efectivo')}
          />
          <MethodTab
            active={method === 'qr'}
            icon={<QrCode size={18} />}
            label={APP_CONFIG.qrProviderLabel}
            onClick={() => setMethod('qr')}
          />
        </div>

        <AnimatePresence mode="wait">
          {method === 'efectivo' ? (
            <motion.div
              key="efectivo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-border bg-cream-100 px-4 py-3">
                <span className="text-sm font-semibold text-ink-muted">Recibido</span>
                <span className="font-display text-2xl font-bold tabular-nums text-ink">
                  {cashInput ? formatCurrency(cashReceived) : '—'}
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={handleExact}
                  className="rounded-full bg-secondary-100 px-3.5 py-2 text-sm font-bold text-secondary-700 cursor-pointer hover:bg-secondary-200"
                >
                  Exacto {formatCurrency(total)}
                </button>
                {QUICK_ADD.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleQuickAdd(amt)}
                    className="rounded-full bg-cream-300 px-3.5 py-2 text-sm font-bold text-ink-muted cursor-pointer hover:bg-cream-200"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <NumericKeypad
                extraKey="."
                onDigit={(d) => setCashInput((prev) => (prev + d).slice(0, 8))}
                onBackspace={() => setCashInput((p) => p.slice(0, -1))}
                onClear={() => setCashInput('')}
              />

              <div
                className={cn(
                  'mt-4 flex items-center justify-between rounded-xl2 px-4 py-3 font-display text-lg font-bold',
                  insufficientCash ? 'bg-amber-50 text-amber-700' : 'bg-secondary-50 text-secondary-700',
                )}
              >
                <span>Vuelto / cambio</span>
                <span className="tabular-nums">{formatCurrency(change)}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center"
            >
              {/* Fondo SIEMPRE blanco y con margen amplio (quiet zone) — nunca usar tokens de tema
                  aquí: cualquier cámara/lector debe poder escanear el QR sin importar el modo. */}
              <div className="relative mb-4 rounded-xl2 border-4 border-primary-200 bg-white p-5 shadow-soft dark:border-primary-400/70">
                <QRCodeSVG value={qrPayload} size={196} fgColor="#241708" bgColor="#FFFFFF" level="M" marginSize={2} />
                {qrPaid && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center rounded-xl2 bg-secondary-500/92"
                  >
                    <CheckCircle2 size={64} className="text-white" />
                  </motion.div>
                )}
              </div>

              <p className="mb-1 text-sm font-semibold text-ink-muted">Ref: {qrRef}</p>

              {secondsLeft > 0 ? (
                <p className="mb-4 text-sm text-ink-soft">
                  Expira en <span className="font-bold tabular-nums text-ink">{minutes}:{seconds}</span>
                </p>
              ) : (
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600">
                  QR expirado
                  <button onClick={regenerateQr} className="flex items-center gap-1 text-primary-600 underline cursor-pointer">
                    <RefreshCw size={14} /> Generar nuevo
                  </button>
                </div>
              )}

              {!qrPaid && secondsLeft > 0 && (
                <button
                  onClick={() => setQrPaid(true)}
                  className="text-xs font-semibold text-ink-soft underline cursor-pointer hover:text-secondary-700"
                >
                  Simular pago recibido (demo)
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={method === 'efectivo' ? insufficientCash : !qrPaid}
          className="flex-[2]"
          size="lg"
        >
          Confirmar pago
        </Button>
      </div>
    </Modal>
  );
}

function MethodTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-touch items-center justify-center gap-2 rounded-xl2 border-2 text-sm font-bold transition-colors cursor-pointer',
        active ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-border bg-surface text-ink-muted hover:border-primary-200',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
