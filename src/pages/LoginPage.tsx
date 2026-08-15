import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useStaffStore } from '@/store/staffStore';
import { useBranchStore } from '@/store/branchStore';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoginLogo } from '@/components/layout/LoginLogo';
import { BranchPicker } from '@/components/layout/BranchPicker';
import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const setCurrentBranch = useAuthStore((s) => s.setCurrentBranch);
  const allUsers = useStaffStore((s) => s.users);
  const allBranches = useBranchStore((s) => s.branches);
  const navigate = useNavigate();
  const location = useLocation();

  // Un usuario bloqueado no debe aparecer ni poder ingresar en la pantalla de PIN.
  const visibleUsers = useMemo(() => allUsers.filter((u) => u.status === 'activo'), [allUsers]);

  // Un cajero con varias sucursales asignadas elige en cuál trabaja hoy antes de entrar;
  // con una sola sucursal (o si es admin) el login ya la dejó resuelta.
  const needsBranchPick = !!currentUser && currentUser.role === 'cajero' && !currentBranchId;
  const branchOptions = useMemo(
    () => allBranches.filter((b) => b.active && currentUser?.branchIds.includes(b.id)),
    [allBranches, currentUser],
  );

  useEffect(() => {
    if (currentUser && !needsBranchPick) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? (currentUser.role === 'admin' ? '/admin/reportes' : '/pos'), {
        replace: true,
      });
    }
  }, [currentUser, needsBranchPick, navigate, location.state]);

  const selectedUser = visibleUsers.find((u) => u.id === selectedId) ?? visibleUsers[0] ?? null;

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    clearError();
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        const ok = loginWithPin(next);
        if (!ok) setPin('');
      }, 120);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-cream to-secondary-50 px-4 py-8 dark:from-primary-900/20 dark:to-secondary-900/20">
      {/* Manchas de color ambientales — vívidas (pastel) en claro, más profundas en oscuro,
          para que la escena tenga vida propia en los dos temas, no solo en uno. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-400/30 blur-3xl dark:bg-primary-500/25"
        animate={{ x: [0, 20, 0], y: [0, 14, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-secondary-400/30 blur-3xl dark:bg-secondary-500/25"
        animate={{ x: [0, -20, 0], y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-300/20 blur-3xl dark:bg-accent-500/10"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-xl3 bg-surface p-7 shadow-card"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LoginLogo />
          <h1 className="sr-only">{APP_CONFIG.storeName}</h1>
          {!needsBranchPick && <p className="text-sm text-ink-muted">Selecciona tu usuario e ingresa tu PIN</p>}
        </div>

        {needsBranchPick && currentUser ? (
          <BranchPicker userName={currentUser.name} branches={branchOptions} onSelect={setCurrentBranch} />
        ) : (
          <>
            {visibleUsers.length === 0 ? (
              <p className="mb-6 text-center text-sm font-semibold text-red-600">
                No hay usuarios activos disponibles. Contacta al administrador.
              </p>
            ) : (
              <div className="mb-6 flex flex-wrap justify-center gap-3">
                {visibleUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedId(u.id);
                      setPin('');
                      clearError();
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white transition-all',
                        u.color,
                        selectedUser?.id === u.id ? 'ring-4 ring-primary-300 scale-105' : 'opacity-60',
                      )}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <span className={cn('text-xs font-semibold', selectedUser?.id === u.id ? 'text-ink' : 'text-ink-soft')}>
                      {u.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="mb-5 flex flex-col items-center gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <ShieldCheck size={14} />
                  {selectedUser.role === 'admin' ? 'Acceso administrador' : 'Acceso cajero'}
                </p>
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-4 w-4 rounded-full border-2 border-primary-300 transition-colors',
                        i < pin.length ? 'bg-primary-500 border-primary-500' : 'bg-transparent',
                      )}
                    />
                  ))}
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-semibold text-red-600"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            <NumericKeypad
              onDigit={handleDigit}
              onBackspace={() => setPin((p) => p.slice(0, -1))}
              onClear={() => setPin('')}
            />

            <p className="mt-5 text-center text-xs text-ink-soft">
              Demo: Admin PIN 1234 · Cajero PIN 1111 / 2222
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
