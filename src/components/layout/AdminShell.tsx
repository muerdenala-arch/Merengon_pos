import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, LogOut, Package, ShieldCheck, Boxes, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { APP_CONFIG } from '@/config/app';

const NAV_ITEMS = [
  { to: '/admin/reportes', label: 'Reportes de venta', icon: BarChart3 },
  { to: '/admin/catalogo', label: 'Catálogo', icon: Package },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/personal', label: 'Personal / Cajeros', icon: Users },
  { to: '/admin/auditoria', label: 'Auditoría de cajas', icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh bg-cream">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-lg font-bold text-white shadow-soft dark:shadow-glow-primary">
            🍹
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold leading-tight text-ink">
              {APP_CONFIG.storeName}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Panel admin</p>
          </div>
          <ThemeToggle />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink-muted transition-colors',
                  isActive ? 'bg-primary-50 text-primary-700' : 'hover:bg-cream-300 hover:text-ink',
                )
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${currentUser?.color}`}>
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink leading-tight">{currentUser?.name}</p>
              <p className="text-xs text-ink-muted">Administrador</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut size={16} /> Cerrar sesión
          </motion.button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
