// Modelo de dominio — POS Juguería

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
}

/** Estado operativo mostrado en el listado de Personal (además de activo/bloqueado). */
export type StaffDisplayStatus = 'caja_abierta' | 'activo' | 'bloqueado';

export type BaseLiquida = 'agua' | 'leche' | 'leche_almendras' | 'yogurt';

export const BASE_LIQUIDA_LABEL: Record<BaseLiquida, string> = {
  agua: 'Agua',
  leche: 'Leche',
  leche_almendras: 'Leche de almendras',
  yogurt: 'Yogurt',
};

export type NivelAzucar = 'sin_azucar' | 'poco' | 'normal' | 'extra';

export const NIVEL_AZUCAR_LABEL: Record<NivelAzucar, string> = {
  sin_azucar: 'Sin azúcar',
  poco: 'Poca azúcar',
  normal: 'Normal',
  extra: 'Extra dulce',
};

export interface SizeOption {
  id: string;
  label: string;
  ounces: number;
  priceDelta: number; // se suma al precio base
}

export interface Topping {
  id: string;
  name: string;
  priceExtra: number;
  stock: number;
  lowStockThreshold: number;
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
  baseLiquidaOptions: BaseLiquida[];
  allowSugarLevel: boolean;
  toppingIds: string[];
  active: boolean;
  stock: number;
  lowStockThreshold: number;
  unit: string; // 'unidades', 'porciones'
}

export interface CartModifiers {
  size: SizeOption;
  baseLiquida: BaseLiquida | null;
  sugarLevel: NivelAzucar | null;
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
  cashReceived?: number;
  change?: number;
  qrRef?: string;
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
  createdAt: string;
}

export type RegisterStatus = 'abierta' | 'cerrada';

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
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
