// Cliente HTTP delgado hacia las funciones serverless en /api — reemplaza el localStorage
// como fuente de verdad. Mismo origen en producción y en `vercel dev` local, así que no
// hace falta configurar una URL base.
import type {
  Branch,
  CashRegisterSession,
  Product,
  QrCode,
  Sale,
  Topping,
  User,
} from '@/types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Error ${res.status} en ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });
const patch = <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

export const api = {
  branches: {
    list: () => get<Branch[]>('/branches'),
    create: (data: Branch) => post<Branch>('/branches', data),
    update: (id: string, data: Partial<Branch>) => patch<Branch>(`/branches/${id}`, data),
  },
  staff: {
    list: () => get<User[]>('/staff'),
    create: (data: Omit<User, 'status' | 'createdAt' | 'protected'>) => post<User>('/staff', data),
    update: (id: string, data: Partial<User>) => patch<User>(`/staff/${id}`, data),
    remove: (id: string) => del(`/staff/${id}`),
  },
  products: {
    list: () => get<Product[]>('/products'),
    create: (data: Product) => post<Product>('/products', data),
    update: (id: string, data: Partial<Product>) => patch<Product>(`/products/${id}`, data),
    remove: (id: string) => del(`/products/${id}`),
  },
  toppings: {
    list: () => get<Topping[]>('/toppings'),
    update: (id: string, data: Partial<Topping>) => patch<Topping>(`/toppings/${id}`, data),
  },
  qrCodes: {
    list: () => get<QrCode[]>('/qr-codes'),
    create: (data: QrCode) => post<QrCode>('/qr-codes', data),
    update: (id: string, data: Partial<QrCode>) => patch<QrCode>(`/qr-codes/${id}`, data),
    setActive: (id: string) => patch<QrCode>(`/qr-codes/${id}`, { setActive: true }),
    remove: (id: string) => del(`/qr-codes/${id}`),
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
    ) => patch<CashRegisterSession>(`/register-sessions/${id}`, data),
  },
  sales: {
    list: () => get<Sale[]>('/sales'),
    create: (data: Omit<Sale, 'ticketNumber'>) => post<Sale>('/sales', data),
  },
  upload: {
    /** Sube una imagen (data URL comprimido en el navegador) a Cloudinary y devuelve su URL pública. */
    image: (dataUrl: string, folder: 'receipts' | 'qr-codes') =>
      post<{ url: string }>('/upload', { image: dataUrl, folder }),
  },
};
