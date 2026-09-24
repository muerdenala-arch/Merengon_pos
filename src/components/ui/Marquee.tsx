import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  /** Etiqueta a renderizar (por defecto span). Siempre queda como bloque de una sola línea. */
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3';
}

// Velocidad de desplazamiento (px/s) — lenta para poder leer mientras se mueve.
const SPEED_PX_PER_S = 28;

/** Texto de UNA línea que, si no cabe en su espacio, se desliza de un lado a otro para
 *  mostrarse completo (con pausas al inicio y al final). Si cabe, queda quieto. Con "reducir
 *  movimiento" activado en el teléfono no se anima y se corta con "…" como antes. */
export function Marquee({ children, className, as: Tag = 'span' }: MarqueeProps) {
  const outerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const overflow = inner.getBoundingClientRect().width - outer.clientWidth;
      setShift(overflow > 2 ? Math.ceil(overflow) + 4 : 0);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  const animating = shift > 0;
  // Ida + vuelta a velocidad constante, más ~3 s de pausas.
  const duration = (shift / SPEED_PX_PER_S) * 2 + 3;
  const style = animating
    ? ({ '--marquee-shift': `-${shift}px`, animationDuration: `${duration}s` } as CSSProperties)
    : undefined;

  return (
    <Tag
      ref={outerRef as never}
      className={cn('block min-w-0 max-w-full overflow-hidden whitespace-nowrap text-ellipsis', className)}
    >
      <span ref={innerRef} className={animating ? 'marquee-run' : undefined} style={style}>
        {children}
      </span>
    </Tag>
  );
}
