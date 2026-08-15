import { motion, useReducedMotion } from 'framer-motion';
import { resolveTheme, useThemeStore } from '@/store/themeStore';
import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/utils';
import logoFull from '@/assets/brand/logo-full.png';
import logoFullDark from '@/assets/brand/logo-full-dark.png';

// Gotitas de jugo flotando alrededor del logo — mismo elemento en ambos temas, pero es lo
// que le da a "claro" su propio momento en vez de sentirse como un oscuro apagado: colores
// frutales saturados y movimiento propio, sin depender del glow que solo brilla en oscuro.
const DROPLETS = [
  { color: 'bg-primary-400', size: 12, top: '4%', left: '10%', delay: 0 },
  { color: 'bg-accent-400', size: 9, top: '65%', left: '4%', delay: 0.6 },
  { color: 'bg-secondary-400', size: 10, top: '8%', left: '88%', delay: 1.1 },
  { color: 'bg-primary-300', size: 7, top: '70%', left: '92%', delay: 1.6 },
];

/**
 * Logo del login: sin placa detrás, con un halo "splash" animado, gotitas frutales que
 * flotan alrededor y un brillo que lo recorre una vez al montar. En oscuro cambia a la
 * variante de texto claro (el logo original trae el wordmark en negro puro, ilegible sobre
 * fondo oscuro); en claro compensa con un glow cálido a color y las gotitas más saturadas
 * para que tenga tanta personalidad como la versión oscura, no solo "el logo de siempre".
 */
export function LoginLogo() {
  const mode = useThemeStore((s) => s.mode);
  const isDark = resolveTheme(mode) === 'dark';
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mb-1 flex h-28 items-center justify-center md:h-32">
      {/* Halo "splash" de color detrás del logo — respira lento, vívido en los dos temas. */}
      <motion.div
        aria-hidden
        className={cn(
          'absolute h-40 w-40 rounded-full blur-3xl md:h-48 md:w-48',
          'bg-[conic-gradient(from_0deg,theme(colors.primary.400),theme(colors.accent.400),theme(colors.secondary.400),theme(colors.primary.400))]',
          isDark ? 'opacity-45' : 'opacity-55',
        )}
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.12, 1], rotate: [0, 20, 0], opacity: isDark ? [0.4, 0.55, 0.4] : [0.45, 0.62, 0.45] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Gotitas frutales flotando — reforzadas en claro, donde no hay glow blanco que le dé
          vida propia a la escena. */}
      {!reduceMotion &&
        DROPLETS.map((d, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={cn('absolute rounded-full shadow-md', d.color)}
            style={{ width: d.size, height: d.size, top: d.top, left: d.left }}
            animate={{ y: [0, -10, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: d.delay }}
          />
        ))}

      {/* Contenedor recortado para el barrido de brillo — el propio <img> queda fuera del
          overflow-hidden (necesita "respirar" con el drop-shadow) así que el brillo vive en
          una capa hermana del mismo tamaño. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -8, y: 10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 15, delay: 0.05 }}
        className="relative"
      >
        <div className="relative overflow-hidden">
          <img
            src={isDark ? logoFullDark : logoFull}
            alt={APP_CONFIG.storeName}
            className="relative z-10 mx-auto h-20 w-auto object-contain md:h-24 [filter:drop-shadow(0_4px_10px_rgba(241,113,10,0.3))_drop-shadow(0_14px_22px_rgba(0,0,0,0.12))] dark:[filter:drop-shadow(0_0_20px_rgba(255,255,255,0.22))_drop-shadow(0_8px_18px_rgba(0,0,0,0.65))]"
          />
          {!reduceMotion && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-20 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/50"
              initial={{ x: '-140%' }}
              animate={{ x: '260%' }}
              transition={{ duration: 1.1, delay: 0.7, ease: 'easeInOut' }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
