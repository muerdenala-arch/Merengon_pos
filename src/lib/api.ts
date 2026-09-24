// Cliente HTTP delgado hacia las funciones serverless en /api — reemplaza el localStorage
// como fuente de verdad. Mismo origen en producción y en `vercel dev` local, así que no
// hace falta configurar una URL base.
import type {
  Branch,
  CashRegisterSession,
  Coupon,
  Product,
  Promotion,
  QrCode,
  Sale,
  Topping,
  User,
  Category,
  Expense,
  StockMovement,
  StockOp,
} from '@/types';

// Si Neon/la función serverless se cuelga (cold start, pool sin responder), sin esto el
// fetch queda pendiente indefinidamente y el store nunca sale de `hydrated: false` — la
// app se queda trabada en "Sincronizando…" sin feedback. Con el timeout, la promesa
// rechaza a tiempo y cada store puede mostrar el error en vez de esperar para siempre.
const REQUEST_TIMEOUT_MS = 10000;

// Token de sesión firmado por el servidor (ver api/_lib/auth.ts) — se guarda acá en vez de
// leer el authStore directamente para evitar un ciclo de imports (authStore -> staffStore
// -> api.ts -> authStore). authStore llama a setAuthToken() al iniciar sesión, al
// rehidratarse desde localStorage y al cerrar sesión.
let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  _authToken = token;
}
/** Para llamadas que hacen `fetch` directo en vez de pasar por `request()` (syncManager —
 *  las ventas/gastos/cajas encoladas offline se mandan fuera de este módulo). */
export function getAuthHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

// El token dura 24h en el servidor (ver api/_lib/auth.ts), pero el front nunca lo revisaba:
// un admin que dejaba la tablet "logueada" más de un día seguía viendo su usuario en pantalla
// (currentUser vive en localStorage sin fecha de vencimiento) y cada acción que sí exige
// sesión (reportes, editar personal, etc.) fallaba con 401 para siempre — "Reintentar" nunca
// arreglaba nada porque se reenviaba el mismo token vencido. Con este hook, authStore se
// entera del 401 y cierra la sesión al toque para que la persona vuelva a poner su PIN.
let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) {
  _onSessionExpired = fn;
}

async function request<T>(path: string, options?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`/api${path}`, window.location.origin);
    if (!options || !options.method || options.method === 'GET') {
      url.searchParams.append('_t', Date.now().toString());
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_authToken) headers.Authorization = `Bearer ${_authToken}`;

    const res = await fetch(url.pathname + url.search, {
      headers,
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      if (res.status === 401) _onSessionExpired?.();
      throw new Error(body.error || `Error ${res.status} en ${path}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s) al conectar con ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const get = <T>(path: string, timeoutMs?: number) => request<T>(path, undefined, timeoutMs);
const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });
const patch = <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

// El plan Hobby de Vercel limita a 12 funciones serverless por deployment, así que cada
// recurso vive en UN solo archivo (/api/branches.ts, etc.) que resuelve la colección o un
// ítem puntual según lleve o no `?id=`, en vez de una carpeta con index.ts + [id].ts.
const withId = (path: string, id: string) => `${path}?id=${encodeURIComponent(id)}`;

export const api = {
  branches: {
    list: () => get<Branch[]>('/branches'),
    create: (data: Branch) => post<Branch>('/branches', data),
    update: (id: string, data: Partial<Branch>) => patch<Branch>(withId('/branches', id), data),
    remove: (id: string) => del(withId('/branches', id)),
  },
  staff: {
    list: () => get<User[]>('/staff'),
    create: (data: Omit<User, 'status' | 'createdAt' | 'protected'>) => post<User>('/staff', data),
    update: (id: string, data: Partial<User>) => patch<User>(withId('/staff', id), data),
    remove: (id: string) => del(withId('/staff', id)),
    /** Login real: el PIN se valida en el servidor, que devuelve el usuario (sin pin) +
     *  un token firmado. Reemplaza la comparación de PIN en el navegador. */
    login: (pin: string) => post<{ user: User; token: string }>('/staff?action=login', { pin }),
  },
  products: {
    list: () => get<Product[]>('/products'),
    create: (data: Product) => post<Product>('/products', data),
    update: (id: string, data: Partial<Product> & { stockOp?: StockOp }) =>
      patch<Product>(withId('/products', id), data),
    remove: (id: string) => del(withId('/products', id)),
  },
  toppings: {
    list: () => get<Topping[]>('/toppings'),
    create: (data: Topping) => post<Topping>('/toppings', data),
    update: (id: string, data: Partial<Topping> & { stockOp?: StockOp }) =>
      patch<Topping>(withId('/toppings', id), data),
    remove: (id: string) => del(withId('/toppings', id)),
  },
  qrCodes: {
    list: () => get<QrCode[]>('/qr-codes'),
    create: (data: QrCode) => post<QrCode>('/qr-codes', data),
    update: (id: string, data: Partial<QrCode>) => patch<QrCode>(withId('/qr-codes', id), data),
    setActive: (id: string) => patch<QrCode>(withId('/qr-codes', id), { setActive: true }),
    remove: (id: string) => del(withId('/qr-codes', id)),
  },
  registerSessions: {
    list: () => get<CashRegisterSession[]>('/register-sessions'),
    open: (data: Pick<CashRegisterSession, 'id' | 'cashierId' | 'cashierName' | 'branchId' | 'openingAmount' | 'notes'>) =>
      post<CashRegisterSession>('/register-sessions', data),
    close: (
      id: string,
      data: {
        closingAmountCounted: number;
        expectedAmount: number;
        salesTotal: number;
        salesCount: number;
        cashSalesTotal: number;
        qrSalesTotal: number;
        notes?: string;
      },
    ) => patch<CashRegisterSession>(withId('/register-sessions', id), data),
  },
  sales: {
    list: () => get<Sale[]>('/sales'),
    create: (data: Omit<Sale, 'ticketNumber'>) => post<Sale>('/sales', data),
  },
  categories: {
    list: () => get<Category[]>('/categories'),
    create: (data: Partial<Category>) => post<Category>('/categories', data),
    remove: (id: string) => del(withId('/categories', id)),
  },
  upload: {
    /** Sube una imagen (data URL comprimido en el navegador) a Cloudinary y devuelve su URL pública. */
    image: (dataUrl: string, folder: 'receipts' | 'qr-codes' | 'products') =>
      post<{ url: string }>('/upload', { image: dataUrl, folder }),
  },
  promotions: {
    list: (activeOnly?: boolean) => get<Promotion[]>(`/promotions${activeOnly ? '?active=true' : ''}`),
    create: (data: Promotion) => post<Promotion>('/promotions', data),
    update: (id: string, data: Partial<Promotion>) => patch<Promotion>(withId('/promotions', id), data),
    remove: (id: string) => del(withId('/promotions', id)),
  },
  settings: {
    get: () => get<Record<string, unknown>>('/settings'),
    update: (data: Record<string, unknown>) => post<Record<string, unknown>>('/settings', data),
  },
  coupons: {
    list: () => get<Coupon[]>('/coupons'),
    validate: (code: string, branchId: string) => get<Coupon>(`/coupons?validate=${encodeURIComponent(code)}&branchId=${encodeURIComponent(branchId)}`),
    create: (data: Coupon) => post<Coupon>('/coupons', data),
    update: (id: string, data: Partial<Coupon>) => patch<Coupon>(withId('/coupons', id), data),
    remove: (id: string) => del(withId('/coupons', id)),
  },
  adminReports: {
    // Timeout más generoso que el default (10s): esta consulta trae ventas + sesiones del
    // período completo y en redes más lentas (wifi de tablet, celular) puede tardar más que
    // el resto de la app sin que signifique que algo esté realmente caído.
    get: (startDate: string, endDate: string, branchId?: string) =>
      get<{ sales: Sale[]; sessions: CashRegisterSession[]; monthlyTotal: number; weeklyTotal: number; yearlyTotal: number; totalDiscounts: number; dailyExpenses: number; weeklyExpenses: number; monthlyExpenses: number; yearlyExpenses: number; }>(`/sales?action=reports&startDate=${startDate}&endDate=${endDate}${branchId ? `&branchId=${branchId}` : ''}`, 25000),
  },
  expenses: {
    list: () => get<Expense[]>('/expenses'),
    create: (data: Expense) => post<Expense>('/expenses', data),
  },
  stockMovements: {
    list: (branchId?: string, productId?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      if (productId) params.append('productId', productId);
      if (limit) params.append('limit', limit.toString());
      const query = params.toString();
      return get<StockMovement[]>(`/stock_movements${query ? `?${query}` : ''}`);
    },
    create: (data: StockMovement) => post<StockMovement>('/stock_movements', data),
    /** Transferencia atómica de stock entre 2 sucursales (ej. retiro de bodega) — se
     *  descuenta+acredita+registra el kardex en una sola transacción del servidor. */
    transfer: (data: {
      id: string; productId: string; fromBranchId: string; toBranchId: string;
      quantity: number; userId: string; notes?: string;
    }) => post<{ alreadyDone: boolean; stockByBranch?: Record<string, number> }>(
      '/stock_movements?action=transfer', data,
    ),
  },
};
