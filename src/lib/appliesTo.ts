// "Aplica a" de una promoción o cupón se guarda como texto. Un solo destino es:
//   'ALL'  |  'Nombre de categoría'  |  'PRODUCT:<id>'  |  'SIZE:<id>:<sizeId>'
// Varios destinos van separados por '|' (ej. 'PRODUCT:a|PRODUCT:b') — un valor viejo con un
// solo destino sigue siendo válido tal cual.
const SEP = '|';

export function parseTargets(appliesTo: string): string[] {
  return appliesTo.split(SEP).filter(Boolean);
}

export function joinTargets(targets: string[]): string {
  return targets.length === 0 ? 'ALL' : targets.join(SEP);
}

/** ¿Este producto (o este tamaño) entra en el "aplica a"? */
export function appliesToMatches(
  appliesTo: string,
  product: { id: string; category: string },
  sizeId?: string,
): boolean {
  return parseTargets(appliesTo).some(
    (t) =>
      t === 'ALL' ||
      t === product.category ||
      t === `PRODUCT:${product.id}` ||
      (!!sizeId && t === `SIZE:${product.id}:${sizeId}`),
  );
}
