import { motion } from 'framer-motion';
import { LoginLogo } from '@/components/layout/LoginLogo';

/** Pantalla de arranque mientras llega la primera respuesta de Neon (sucursales, personal,
 *  catálogo, etc.). Sin esto se alcanza a ver un parpadeo con la semilla local — un login
 *  vacío o un catálogo desactualizado — antes de que el primer fetch reemplace los datos. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary-50 via-cream to-secondary-50 px-4 dark:from-primary-900/20 dark:to-secondary-900/20">
      <LoginLogo />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm font-semibold text-ink-muted"
      >
        Sincronizando…
      </motion.p>
    </div>
  );
}
