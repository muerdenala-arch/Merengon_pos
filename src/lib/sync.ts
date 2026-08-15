/**
 * Compara dos valores serializables por contenido (no por referencia). Se usa en el
 * `fetchAll` de cada store: si lo que llegó del servidor es idéntico a lo que ya había,
 * NO se llama a `set()` con un array/objeto nuevo — así React no re-renderiza pantallas
 * enteras (login, catálogo) en cada tick del polling de 6s cuando en realidad nada cambió.
 * Zustand solo notifica a los suscriptores cuando la referencia devuelta por `set` es
 * distinta, así que devolver el `state` sin tocar es lo que evita el render de más.
 */
export function sameData<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
