import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Lee `state.highlightId` de la navegación (lo manda, por ejemplo, la campana de stock bajo),
 *  baja hasta el elemento con `id="hl-<id>"` y devuelve ese id durante unos segundos para que
 *  la pantalla lo marque visualmente (ver `flash-highlight` en index.css). */
export function useNavHighlight(): string | null {
  const location = useLocation();
  const target = (location.state as { highlightId?: string } | null)?.highlightId ?? null;
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setActive(target);
    const scrollTimer = setTimeout(() => {
      document.getElementById(`hl-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    const offTimer = setTimeout(() => setActive(null), 4500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(offTimer);
    };
  }, [target, location.key]);

  return active;
}
