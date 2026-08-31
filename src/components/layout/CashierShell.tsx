import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MapPin, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { APP_CONFIG } from '@/config/app';
import logoMark from '@/assets/brand/logo-mark.png';
import { logoGlowClasses } from '@/lib/brand';
import { cn } from '@/lib/utils';

export function CashierShell({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const logout = useAuthStore((s) => s.logout);
  const activeSession = useRegisterStore((s) => s.activeSession());
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === currentBranchId));
  const navigate = useNavigate();

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
          <ThemeToggle className="ml-1 flex-shrink-0 sm:ml-2" />
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            to={activeSession ? '/caja/cierre' : '/caja/apertura'}
            aria-label={activeSession ? 'Cerrar caja' : 'Abrir caja'}
            className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-xl border-2 border-border px-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-primary-300 hover:text-primary-700 sm:px-3.5"
          >
            <Wallet size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline">{activeSession ? 'Cerrar caja' : 'Abrir caja'}</span>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-cream-300 py-1.5 pl-1.5 pr-1.5 sm:pr-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${currentUser?.color}`}>
              {currentUser?.name.charAt(0)}
            </div>
            <span className="hidden text-sm font-semibold text-ink sm:inline">{currentUser?.name.split(' ')[0]}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
