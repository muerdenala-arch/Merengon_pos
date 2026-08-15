import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Receipt } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Sale } from '@/types';
import { BASE_LIQUIDA_LABEL, NIVEL_AZUCAR_LABEL } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { APP_CONFIG } from '@/config/app';

interface TicketProps {
  sale: Sale | null;
  onClose: () => void;
}

export function Ticket({ sale, onClose }: TicketProps) {
  if (!sale) return null;

  return (
    <Modal open={!!sale} onClose={onClose} size="sm">
      <div className="px-6 pb-6 pt-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 18 }}
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600"
        >
          <CheckCircle2 size={36} />
        </motion.div>
        <p className="mb-5 text-center font-display text-lg font-bold text-ink">Venta completada</p>

        <div id="ticket-print" className="rounded-xl2 border-2 border-dashed border-border bg-cream-100 p-4 font-mono text-xs text-ink">
          <div className="mb-2 text-center">
            <p className="font-display text-sm font-extrabold tracking-tight">{APP_CONFIG.storeName}</p>
            <p className="text-[11px] text-ink-muted">Ticket #{sale.ticketNumber}</p>
            <p className="text-[11px] text-ink-muted">{formatDateTime(sale.createdAt)}</p>
            <p className="text-[11px] text-ink-muted">Cajero: {sale.cashierName}</p>
          </div>
          <div className="my-2 border-t border-dashed border-ink-soft/50" />
          {sale.items.map((item) => (
            <div key={item.lineId} className="mb-1.5">
              <div className="flex justify-between font-semibold">
                <span>
                  {item.quantity}x {item.product.name} ({item.modifiers.size.label})
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
              <p className="text-[10px] text-ink-muted">
                {[
                  item.modifiers.baseLiquida && BASE_LIQUIDA_LABEL[item.modifiers.baseLiquida],
                  item.modifiers.sugarLevel && NIVEL_AZUCAR_LABEL[item.modifiers.sugarLevel],
                  ...item.modifiers.toppings.map((t) => t.name),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ))}
          <div className="my-2 border-t border-dashed border-ink-soft/50" />
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="mt-1 flex justify-between text-ink-muted">
            <span>Pago</span>
            <span className="uppercase">{sale.payment.method === 'efectivo' ? 'Efectivo' : APP_CONFIG.qrProviderLabel}</span>
          </div>
          {sale.payment.method === 'efectivo' && (
            <>
              <div className="flex justify-between text-ink-muted">
                <span>Recibido</span>
                <span>{formatCurrency(sale.payment.cashReceived ?? 0)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Vuelto</span>
                <span>{formatCurrency(sale.payment.change ?? 0)}</span>
              </div>
            </>
          )}
          {sale.payment.method === 'qr' && (
            <div className="flex justify-between text-ink-muted">
              <span>Ref. QR</span>
              <span>{sale.payment.qrRef}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed border-ink-soft/50" />
          <p className="text-center text-[11px]">{APP_CONFIG.ticketFooter}</p>
        </div>

        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Button>
          <Button className="flex-1" onClick={onClose}>
            <Receipt size={16} /> Nueva venta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
