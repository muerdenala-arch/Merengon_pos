import { type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MapPin, Wallet, WifiOff, RefreshCw, Receipt, ArrowLeft, MoreVertical, PackageOpen } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { useCartStore } from '@/store/cartStore';
import { useCouponStore } from '@/store/couponStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ReloadButton } from '@/components/ui/ReloadButton';
import { APP_CONFIG } from '@/config/app';
import logoMark from '@/assets/brand/logo-mark.png';
import { logoGlowClasses } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { onSyncStateChange } from '@/lib/syncManager';
import { ExpenseModal } from '@/components/pos/ExpenseModal';
import { BodegaWithdrawalModal } from '@/components/pos/BodegaWithdrawalModal';

export function CashierShell({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const logout = useAuthStore((s) => s.logout);
  const clearCurrentBranch = useAuthStore((s) => s.clearCurrentBranch);
  const activeSession = useRegisterStore((s) => s.activeSession(currentBranchId));
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === currentBranchId));
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBodegaModalOpen, setIsBodegaModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onSyncStateChange((count, online) => {
      setIsOnline(online);
      setPendingCount(count);
    });
    return unsub;
  }, []);

  // Antes de abrir caja, "volver atrás" debe dejar re-elegir sucursal si el cajero tiene
  // varias asignadas — si no, `navigate(-1)` no vuelve al selector (esa pantalla nunca
  // tuvo su propia URL) y el cajero queda atrapado en la sucursal que tocó por error.
  // Con la caja ya abierta no tiene sentido cambiarla a mitad de turno, así que el botón
  // vuelve a su comportamiento normal de historial.
  const canReselectBranch = !activeSession && (currentUser?.branchIds.length ?? 0) > 1;

  function handleBack() {
    if (canReselectBranch) {
      clearCurrentBranch();
      navigate('/login', { replace: true });
    } else {
      navigate(-1);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-cream">
      {/* gap-1.5/px-3 en mobile vertical (~360-430px de ancho): con los 5 elementos a full
          tamaño (logo + nombre de tienda + estado + tema + usuario + cerrar caja) no entran
          en una fila — cada uno se compacta (ícono solo, sin texto) por debajo de `sm` y
          recupera su versión completa a partir de 640px. */}
      <header className="flex items-center justify-between gap-1.5 border-b border-border bg-surface px-3 py-2.5 shadow-soft sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-primary-200 shadow-sm sm:h-9 sm:w-9 dark:border-primary-900/50">
            <img
              src={logoMark}
              alt={APP_CONFIG.storeName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="hidden truncate font-display text-base font-bold leading-tight text-ink sm:block">
              {APP_CONFIG.storeName}
            </p>
            <p className="flex items-center gap-1 whitespace-nowrap text-xs text-ink-muted sm:gap-1.5">
              {activeSession ? (
                <span className="inline-flex items-center gap-1 text-secondary-700">
                  <Wallet size={12} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Caja abierta</span>
                  <span className="sm:hidden">Abierta</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Wallet size={12} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Caja cerrada</span>
                  <span className="sm:hidden">Cerrada</span>
                </span>
              )}
              {branch && (
                <>
                  <span className="hidden text-ink-soft sm:inline">·</span>
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <MapPin size={11} /> {branch.name}
                  </span>
                </>
              )}
            </p>
          </div>
          <ReloadButton className="ml-1 sm:ml-2" />
          <ThemeToggle className="ml-1 flex-shrink-0 sm:ml-2" />
          {/* Indicador de estado de red y ventas pendientes de sincronizar */}
          {(!isOnline || pendingCount > 0) && (
            <div
              title={
                !isOnline
                  ? `Sin conexión — ${pendingCount} venta${pendingCount !== 1 ? 's' : ''} en cola`
                  : `Sincronizando ${pendingCount} venta${pendingCount !== 1 ? 's' : ''}...`
              }
              className={cn(
                'ml-1 flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
                !isOnline
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
              )}
            >
              {!isOnline ? (
                <WifiOff size={11} className="flex-shrink-0" />
              ) : (
                <RefreshCw size={11} className="flex-shrink-0 animate-spin" />
              )}
              <span className="hidden sm:inline">
                {!isOnline ? 'Sin red' : 'Sincronizando'}
              </span>
              {pendingCount > 0 && <span>·{pendingCount}</span>}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3 relative">
          <button
            onClick={handleBack}
            aria-label={canReselectBranch ? 'Elegir otra sucursal' : 'Volver atrás'}
            title={canReselectBranch ? 'Elegir otra sucursal' : undefined}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-surface text-ink-muted transition-colors hover:border-primary-300 hover:text-primary-700"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-cream-300 py-1.5 pl-1.5 pr-1.5 sm:pr-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${currentUser?.color}`}>
              {currentUser?.name.charAt(0)}
            </div>
            <span className="hidden text-sm font-semibold text-ink sm:inline">{currentUser?.name.split(' ')[0]}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menú de opciones"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-surface text-ink-muted transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMenuOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-56 flex flex-col gap-2 rounded-xl border border-border bg-surface p-2 shadow-card z-50">
                  {activeSession && (
                    <>
                      <button
                        onClick={() => { setIsBodegaModalOpen(true); setIsMenuOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        <PackageOpen size={18} /> Bodega
                      </button>
                      <button
                        onClick={() => { setIsExpenseModalOpen(true); setIsMenuOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Receipt size={18} /> Registrar Gasto
                      </button>
                    </>
                  )}
                  <Link
                    to={activeSession ? '/caja/cierre' : '/caja/apertura'}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-cream-100 transition-colors"
                  >
                    <Wallet size={18} /> {activeSession ? 'Cerrar caja' : 'Abrir caja'}
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      useCartStore.getState().clear();
                      useCouponStore.getState().removeCoupon();
                      logout();
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
      />
      {activeSession && (
        <BodegaWithdrawalModal
          open={isBodegaModalOpen}
          onClose={() => setIsBodegaModalOpen(false)}
        />
      )}
    </div>
  );
}
