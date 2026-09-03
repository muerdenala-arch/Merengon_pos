// Modelo de dominio — POS Juguería

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
}

export type Role = 'admin' | 'cajero';

export type StaffStatus = 'activo' | 'bloqueado';

export interface User {
  id: string;
  name: string;
  pin: string; // PIN de 4 dígitos para login táctil
  role: Role;
  color: string; // clase tailwind para el avatar (fondo del círculo)
  status: StaffStatus; // 'bloqueado' no puede iniciar sesión ni aparece en el login
  createdAt: string; // ISO — fecha de registro
  /** Administrador principal sembrado por el sistema: no se puede eliminar ni bloquear. */
  protected?: boolean;
  /** Sucursales donde puede operar. 1 sola = entra directo; varias = elige al iniciar turno. */
  branchIds: string[];
}

/** Estado operativo mostrado en el listado de Personal (además de activo/bloqueado). */
export type StaffDisplayStatus = 'caja_abierta' | 'activo' | 'bloqueado';

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface SizeOption {
  id: string;
  label: string;
  ounces: number;
  price: number; // precio final del tamaño
}

export interface Topping {
  id: string;
  name: string;
  priceExtra: number;
  /** Stock independiente por sucursal: { [branchId]: cantidad }. */
  stockByBranch: Record<string, number>;
  lowStockThreshold: number;
  branchIds: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  gradient: string; // clases tailwind para la tarjeta
  emoji: string; // acento visual (no se usa como ícono funcional)
  sizes: SizeOption[];
  toppingIds: string[];
  branchIds: string[];
  active: boolean;
  /** Stock independiente por sucursal: { [branchId]: cantidad }. */
  stockByBranch: Record<string, number>;
  lowStockThreshold: number;
  unit: string; // 'unidades', 'porciones'
}

export interface CartModifiers {
  size?: SizeOption; // undefined when product has no sizes
  toppings: Topping[];
}

export interface CartItem {
  lineId: string;
  product: Product;
  modifiers: CartModifiers;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export type PaymentMethod = 'efectivo' | 'qr';

export interface Payment {
  method: PaymentMethod;
  amount: number;
  /** Comprobante de transferencia (foto/captura) adjunto al pago por QR, como data URL. */
  receiptImage?: string;
}

export interface Sale {
  id: string;
  ticketNumber: number;
  items: CartItem[];
  subtotal: number;
  total: number;
  payment: Payment;
  cashierId: string;
  cashierName: string;
  registerSessionId: string;
  branchId: string;
  createdAt: string;
}

export interface QrCode {
  id: string;
  alias: string; // ej. "Yape", "Cuenta Principal"
  bankOrHolder: string; // ej. "BMSC", "Banco Unión — Titular Valeria Ríos"
  image: string; // data URL (base64)
  active: boolean;
  branchId: string;
  createdAt: string; // ISO
}

export type RegisterStatus = 'abierta' | 'cerrada';

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  closingAmountCounted?: number;
  expectedAmount?: number;
  difference?: number;
  salesTotal?: number;
  salesCount?: number;
  cashSalesTotal?: number;
  qrSalesTotal?: number;
  status: RegisterStatus;
  notes?: string;
}
