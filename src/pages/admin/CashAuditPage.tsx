import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fieldClasses, fieldLabelClasses } from '@/components/ui/Input';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

export default function CashAuditPage() {
  const allSessions = useRegisterStore((s) => s.sessions);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);
  const staff = useStaffStore((s) => s.users);

  const [cashierId, setCashierId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Solo cajeros que efectivamente tienen sesiones registradas — evita un desplegable
  // lleno de personal que nunca abrió caja.
  const cashierOptions = useMemo(() => {
    const ids = new Set(allSessions.map((s) => s.cashierId));
    return Array.from(ids)
      .map((id) => {
        const session = allSessions.find((s) => s.cashierId === id);
        const staffMember = staff.find((u) => u.id === id);
        return { id, name: staffMember?.name ?? session?.cashierName ?? id };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allSessions, staff]);

  const sessions = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return allSessions.filter((s) => {
      if (adminFilterBranchId && s.branchId !== adminFilterBranchId) return false;
      if (cashierId !== 'all' && s.cashierId !== cashierId) return false;
      const opened = new Date(s.openedAt);
      if (start && opened < start) return false;
      if (end && opened > end) return false;
      return true;
    });
  }, [allSessions, adminFilterBranchId, cashierId, startDate, endDate]);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  const totals = useMemo(() => {
    const closed = sessions.filter((s) => s.status === 'cerrada');
    return {
      count: sessions.length,
      openCount: sessions.length - closed.length,
      salesCount: sessions.reduce((sum, s) => sum + (s.salesCount ?? 0), 0),
      salesTotal: sessions.reduce((sum, s) => sum + (s.salesTotal ?? 0), 0),
      difference: closed.reduce((sum, s) => sum + (s.difference ?? 0), 0),
      closedCount: closed.length,
    };
  }, [sessions]);

  const hasFilters = cashierId !== 'all' || !!startDate || !!endDate;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ShieldCheck size={24} className="text-primary-500" /> Auditoría de cajas
          </h1>
          <p className="text-sm text-ink-muted">
            {adminFilterBranchId
              ? `Historial de ${branchName(adminFilterBranchId)}`
              : 'Historial de todas las sucursales'}
          </p>
        </div>

        {/* Filtros: rango de fechas + cajero */}
        <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <label className="flex flex-col">
            <span className={fieldLabelClasses}>Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(fieldClasses, 'min-h-touch')}
            />
          </label>
          <label className="flex flex-col">
            <span className={fieldLabelClasses}>Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn(fieldClasses, 'min-h-touch')}
            />
          </label>
          <label className="col-span-2 flex flex-col sm:col-span-2">
            <span className={fieldLabelClasses}>Cajero</span>
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className={cn(fieldClasses, 'min-h-touch')}
            >
              <option value="all">Todos los cajeros</option>
              {cashierOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </Card>

        {/* Totales agregados del filtro actual */}
        <Card className="mb-6 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Stat label="Cajas" value={`${totals.count}${totals.openCount > 0 ? ` (${totals.openCount} abiertas)` : ''}`} />
          <Stat label="Ventas" value={String(totals.salesCount)} />
          <Stat label="Total vendido" value={formatCurrency(totals.salesTotal)} />
          <Stat
            label="Diferencia total"
            value={totals.closedCount > 0 ? formatCurrency(totals.difference) : '—'}
            tone={
              totals.closedCount === 0
                ? undefined
                : Math.abs(totals.difference) < 0.01
                  ? 'green'
                  : totals.difference > 0
                    ? 'amber'
                    : 'red'
            }
          />
        </Card>

        {sessions.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">
            {hasFilters ? 'No hay cajas que coincidan con estos filtros.' : 'Aún no hay sesiones de caja registradas.'}
          </Card>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {sessions.map((session) => {
              const hasDifference = session.difference != null && Math.abs(session.difference) >= 0.01;
              const auditDays = branches.find((b) => b.id === session.branchId)?.cashAuditDays ?? 7;
              const daysOpen = Math.floor((Date.now() - new Date(session.openedAt).getTime()) / (24 * 60 * 60 * 1000));
              const isStale = session.status === 'abierta' && daysOpen >= auditDays;
              return (
                <motion.div key={session.id} variants={staggerItem}>
                  <Card className={cn('p-4', isStale && 'border-2 border-red-400 dark:border-red-500/50')}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display font-bold text-ink">{session.cashierName}</p>
                          <Badge tone="primary">{branchName(session.branchId)}</Badge>
                        </div>
                        <p className="text-xs text-ink-muted">
                          Abrió {formatDateTime(session.openedAt)}
                          {session.closedAt && ` · Cerró ${formatDateTime(session.closedAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isStale && (
                          <Badge tone="danger">
                            {daysOpen} día{daysOpen === 1 ? '' : 's'} sin cerrar
                          </Badge>
                        )}
                        <Badge tone={session.status === 'abierta' ? 'secondary' : 'neutral'}>
                          {session.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <Stat label="Apertura" value={formatCurrency(session.openingAmount)} />
                      <Stat label="Ventas" value={session.salesCount != null ? String(session.salesCount) : '—'} />
                      <Stat
                        label="Total vendido"
                        value={session.salesTotal != null ? formatCurrency(session.salesTotal) : '—'}
                      />
                      {session.status === 'cerrada' && (
                        <Stat
                          label="Diferencia"
                          value={session.difference != null ? formatCurrency(session.difference) : '—'}
                          tone={hasDifference ? (session.difference! > 0 ? 'amber' : 'red') : 'green'}
                        />
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'amber' | 'red';
}) {
  return (
    <div className="rounded-xl bg-cream-100 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p
        className={cn(
          'font-display font-bold tabular-nums',
          tone === 'green' && 'text-secondary-700',
          tone === 'amber' && 'text-amber-700',
          tone === 'red' && 'text-red-700',
          !tone && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
