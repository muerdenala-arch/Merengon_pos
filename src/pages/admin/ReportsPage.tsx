import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Banknote, QrCode, Receipt, TrendingUp } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { useSalesStore } from '@/store/salesStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatCurrency } from '@/lib/utils';

type RangeFilter = 'hoy' | 'todo';

export default function ReportsPage() {
  const sales = useSalesStore((s) => s.sales);
  const [range, setRange] = useState<RangeFilter>('hoy');

  const filtered = useMemo(() => {
    if (range === 'todo') return sales;
    const today = new Date().toDateString();
    return sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  }, [sales, range]);

  const totalSales = filtered.reduce((sum, s) => sum + s.total, 0);
  const cashTotal = filtered.filter((s) => s.payment.method === 'efectivo').reduce((sum, s) => sum + s.total, 0);
  const qrTotal = filtered.filter((s) => s.payment.method === 'qr').reduce((sum, s) => sum + s.total, 0);
  const avgTicket = filtered.length ? totalSales / filtered.length : 0;

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    filtered.forEach((sale) => {
      sale.items.forEach((item) => {
        const entry = map.get(item.product.id) ?? { name: item.product.name, qty: 0, total: 0 };
        entry.qty += item.quantity;
        entry.total += item.lineTotal;
        map.set(item.product.id, entry);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [filtered]);

  const maxQty = Math.max(1, ...topProducts.map((p) => p.qty));

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <BarChart3 size={24} className="text-primary-500" /> Reportes de venta
            </h1>
            <p className="text-sm text-ink-muted">Resumen de desempeño de la juguería.</p>
          </div>
          <div className="flex gap-2 rounded-full bg-cream-300 p-1">
            {(['hoy', 'todo'] as RangeFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-colors',
                  range === r ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted',
                )}
              >
                {r === 'hoy' ? 'Hoy' : 'Todo el historial'}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
        >
          <StatCard icon={<TrendingUp size={18} />} label="Total vendido" value={formatCurrency(totalSales)} tone="primary" />
          <StatCard icon={<Receipt size={18} />} label="Ventas" value={String(filtered.length)} tone="secondary" />
          <StatCard icon={<Banknote size={18} />} label="Ticket promedio" value={formatCurrency(avgTicket)} tone="accent" />
          <StatCard icon={<QrCode size={18} />} label="Ventas QR" value={formatCurrency(qrTotal)} tone="neutral" />
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Productos más vendidos</h2>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-soft">Sin datos para este período.</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p) => (
                  <div key={p.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">{p.name}</span>
                      <span className="text-ink-muted tabular-nums">
                        {p.qty} u. · {formatCurrency(p.total)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-300">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.qty / maxQty) * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Métodos de pago</h2>
            <PaymentBar label="Efectivo" amount={cashTotal} total={totalSales} color="bg-secondary-500" />
            <PaymentBar label="QR Dinámico" amount={qrTotal} total={totalSales} color="bg-accent-500" />

            <h2 className="mb-3 mt-6 font-display text-lg font-bold text-ink">Últimas ventas</h2>
            <div className="max-h-60 space-y-2 overflow-y-auto no-scrollbar">
              {filtered.slice(0, 8).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2 text-sm">
                  <span className="font-semibold text-ink">#{sale.ticketNumber} · {sale.cashierName}</span>
                  <span className="tabular-nums text-ink-muted">{formatCurrency(sale.total)}</span>
                </div>
              ))}
              {filtered.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">Sin ventas aún.</p>}
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'accent' | 'neutral';
}) {
  const toneClasses = {
    primary: 'bg-primary-50 text-primary-700',
    secondary: 'bg-secondary-50 text-secondary-700',
    accent: 'bg-accent-50 text-accent-700',
    neutral: 'bg-cream-300 text-ink-muted',
  };
  return (
    <motion.div variants={staggerItem}>
      <Card className="p-4">
        <div className={cn('mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl', toneClasses[tone])}>
          {icon}
        </div>
        <p className="font-display text-xl font-extrabold tabular-nums text-ink">{value}</p>
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
      </Card>
    </motion.div>
  );
}

function PaymentBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-ink-muted">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-300">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}
