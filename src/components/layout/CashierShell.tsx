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
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3 shadow-soft">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt={APP_CONFIG.storeName} className={cn('h-9 w-auto flex-shrink-0 object-contain', logoGlowClasses)} />
          <div>
            <p className="font-display text-base font-bold leading-tight text-ink">
              {APP_CONFIG.storeName}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              {activeSession ? (
                <span className="inline-flex items-center gap-1 text-secondary-700">
                  <Wallet size={12} /> Caja abierta
                </span>
              ) : (
                <span className="text-amber-700">Caja cerrada</span>
              )}
              {branch && (
                <>
                  <span className="text-ink-soft">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {branch.name}
                  </span>
                </>
              )}
            </p>
          </div>
          <ThemeToggle className="ml-2" />
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={activeSession ? '/caja/cierre' : '/caja/apertura'}
            className="hidden rounded-xl border-2 border-border px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-primary-300 hover:text-primary-700 sm:block"
          >
            {activeSession ? 'Cerrar caja' : 'Abrir caja'}
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-cream-300 py-1.5 pl-1.5 pr-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentUser?.color}`}>
              {currentUser?.name.charAt(0)}
            </div>
            <span className="text-sm font-semibold text-ink">{currentUser?.name.split(' ')[0]}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
