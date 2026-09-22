import { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, PartyPopper, ShieldAlert, Wallet } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { cn, formatCurrency } from '@/lib/utils';

export default function CashClosePage() {
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const activeSession = useRegisterStore((s) => s.activeSession(currentBranchId));
  const closeRegister = useRegisterStore((s) => s.closeRegister);
  const salesForSession = useSalesStore((s) => s.salesForSession);
  const fetchSales = useSalesStore((s) => s.fetchAll);
  const expenses = useExpenseStore((s) => s.expenses);
  const [counted, setCounted] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  // Re-sync sales from the server whenever the close page mounts, so
  // the totals are correct even if the cashier sold from another device.
  useEffect(() => {
    fetchSales();
    useExpenseStore.getState().fetchAll();
  }, [fetchSales]);

  const sessionSales = useMemo(
    () => (activeSession ? salesForSession(activeSession.id) : []),
    [activeSession, salesForSession],
  );

  const sessionExpenses = useMemo(
    () => activeSession ? expenses.filter(e => e.cashRegisterId === activeSession.id) : [],
    [activeSession, expenses]
  );

  if (!activeSession) {
    return <Navigate to="/caja/apertura" replace />;
  }

  const cashSalesTotal = sessionSales.reduce((sum, s) => {
    if (s.payment.method === 'efectivo') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountEfectivo || 0);
    return sum;
  }, 0);
  
  const qrSalesTotal = sessionSales.reduce((sum, s) => {
    if (s.payment.method === 'qr') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountQr || 0);
    return sum;
  }, 0);
  
  const expensesTotal = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

  const salesTotal = cashSalesTotal + qrSalesTotal;
  const expectedAmount = activeSession.openingAmount + cashSalesTotal - expensesTotal;
  const countedAmount = Number(counted || 0);
  const difference = countedAmount - expectedAmount;

  function performClose() {
    closeRegister(activeSession!.id, {
      closingAmountCounted: countedAmount,
      expectedAmount,
      salesTotal,
      salesCount: sessionSales.length,
      cashSalesTotal,
      qrSalesTotal,
    });
    navigate('/caja/apertura', { replace: true });
  }

  return (
    <CashierShell>
      <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-pop">
              <Wallet size={26} />
            </div>
            <h1 className="font-display text-xl font-bold text-ink">Cierre de caja</h1>
            <p className="text-sm text-ink-muted">{sessionSales.length} ventas registradas</p>
          </div>

          <div className="mb-4 space-y-1.5 rounded-xl2 bg-surface p-4 shadow-soft text-sm">
            <Row label="Monto de apertura" value={formatCurrency(activeSession.openingAmount)} />
            <Row label="Ventas en efectivo" value={formatCurrency(cashSalesTotal)} />
            <Row label="Ventas por QR" value={formatCurrency(qrSalesTotal)} />
            <Row label="Total vendido" value={formatCurrency(salesTotal)} bold />
            <Row label="Gastos registrados" value={`-${formatCurrency(expensesTotal)}`} bold />
            <div className="my-1 border-t border-dashed border-border" />
            <Row label="Efectivo esperado en caja" value={formatCurrency(expectedAmount)} bold />
          </div>

          <p className="mb-2 text-sm font-semibold text-ink-muted">Efectivo contado físicamente</p>
          <div className="mb-4 rounded-xl2 bg-surface p-4 text-center shadow-soft">
            <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
              {counted ? formatCurrency(countedAmount) : formatCurrency(0)}
            </p>
          </div>

          <NumericKeypad
            extraKey="."
            onDigit={(d) => setCounted((prev) => (d === '.' && prev.includes('.') ? prev : (prev + d).slice(0, 8)))}
            onBackspace={() => setCounted((p) => p.slice(0, -1))}
            onClear={() => setCounted('')}
          />

          {counted && (
            <div
              className={cn(
                'mt-4 flex items-center gap-2 rounded-xl2 px-4 py-3 font-display font-bold',
                Math.abs(difference) < 0.01
                  ? 'bg-secondary-50 text-secondary-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {Math.abs(difference) < 0.01 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span className="flex-1">
                {Math.abs(difference) < 0.01
                  ? 'Caja cuadrada'
                  : difference > 0
                    ? 'Sobrante'
                    : 'Faltante'}
              </span>
              <span className="tabular-nums">{formatCurrency(Math.abs(difference))}</span>
            </div>
          )}

          <Button size="lg" variant="danger" className="mt-4 w-full" disabled={!counted} onClick={() => setConfirmOpen(true)}>
            Cerrar caja
          </Button>
        </motion.div>
      </div>

      <CloseConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          performClose();
        }}
        salesTotal={salesTotal}
        salesCount={sessionSales.length}
        expensesTotal={expensesTotal}
        expectedAmount={expectedAmount}
        countedAmount={countedAmount}
        difference={difference}
      />
    </CashierShell>
  );
}

function CloseConfirmModal({
  open,
  onClose,
  onConfirm,
  salesTotal,
  salesCount,
  expensesTotal,
  expectedAmount,
  countedAmount,
  difference,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  salesTotal: number;
  salesCount: number;
  expensesTotal: number;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
}) {
  const squared = Math.abs(difference) < 0.01;
  const surplus = difference > 0;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-pop',
            squared
              ? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-500/15 dark:text-secondary-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
          )}
        >
          {squared ? <PartyPopper size={30} /> : <ShieldAlert size={30} />}
        </motion.div>

        <h2 className="font-display text-lg font-bold text-ink">¿Cerrar la caja?</h2>
        <p className="mb-5 text-sm text-ink-muted">Revisa los números antes de confirmar.</p>

        <div className="mb-4 w-full space-y-1.5 rounded-xl2 bg-field p-4 text-sm">
          <Row label={`Ventas (${salesCount})`} value={formatCurrency(salesTotal)} />
          <Row label="Gastos" value={`-${formatCurrency(expensesTotal)}`} />
          <div className="my-1 border-t border-dashed border-border" />
          <Row label="Efectivo esperado" value={formatCurrency(expectedAmount)} bold />
          <Row label="Efectivo contado" value={formatCurrency(countedAmount)} bold />
        </div>

        <div
          className={cn(
            'mb-5 flex w-full items-center gap-2.5 rounded-xl2 px-4 py-3',
            squared
              ? 'bg-secondary-50 text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-400'
              : surplus
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
          )}
        >
          {squared ? <CheckCircle2 size={20} className="flex-shrink-0" /> : <AlertTriangle size={20} className="flex-shrink-0" />}
          <span className="flex-1 text-left font-display font-bold">
            {squared ? 'La caja está cuadrada' : surplus ? 'Sobrante' : 'Faltante'}
          </span>
          {!squared && <span className="font-display font-bold tabular-nums">{formatCurrency(Math.abs(difference))}</span>}
        </div>

        <p className="mb-5 text-xs text-ink-soft">Esta acción no se puede deshacer.</p>

        <div className="flex w-full gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            Confirmar cierre
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('tabular-nums text-ink', bold && 'font-bold')}>{value}</span>
    </div>
  );
}
