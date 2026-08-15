# 🍊 Jugoso — POS

POS táctil, ligero y con identidad visual "frutal fresca", construido para operar rápido en pantallas táctiles (tablet / kiosko).

## Stack

- **React 18 + Vite + TypeScript** — build ligero, HMR instantáneo, sin overhead de SSR (no se necesita para un POS de tienda física).
- **Tailwind CSS** — design tokens de la paleta frutal en `tailwind.config.ts`.
- **Framer Motion** — transiciones de página, stagger de catálogo, modales, carrito animado, feedback táctil (`whileTap`).
- **Lucide React** — iconografía SVG (nunca emoji como ícono funcional).
- **Zustand + persist** — estado global (auth, catálogo, carrito, caja, ventas) persistido en `localStorage` para que la demo funcione sin backend.
- **react-router-dom** — rutas protegidas por rol.
- **qrcode.react** — generación de QR dinámico por transacción.

## Dirección visual (UI/UX Pro Max)

- **Paleta "Frutal Fresca"**: mango (`primary`, `#F1710A`) + lima (`secondary`, `#1E9E5A`) + sandía (`accent`, `#EC4899`) sobre fondo crema cálido (`cream`). Contraste verificado para texto sobre fondo/tarjetas.
- **Tipografía**: `Poppins` (display, botones, precios) + `Nunito Sans` (texto de UI) — geométrica, redondeada y muy legible a distancia táctil.
- **Touch targets**: mínimo 48px de alto (`min-h-touch`), 64px en teclados numéricos (`min-h-touch-lg`), spacing ≥ 8px entre elementos interactivos.
- **Motion**: entradas con stagger + spring "rebote frutal", salidas más rápidas que las entradas, `prefers-reduced-motion` respetado globalmente.

## Roles

| Rol | Acceso |
|---|---|
| **Administrador** (PIN demo `1234`) | Catálogo, Inventario, Auditoría de cajas, Reportes de venta |
| **Cajero** (PIN demo `1111` / `2222`) | Venta rápida táctil, apertura y cierre de caja |

El login es por selección de usuario + PIN de 4 dígitos (pensado para tablet). El rol determina las rutas accesibles (`src/router/RequireAuth.tsx`).

## Funcionalidades clave

- **Catálogo con modificadores**: tamaño, base líquida, nivel de azúcar, agregados/toppings — precio unitario recalculado en vivo (`src/components/pos/ModifierModal.tsx`).
- **Checkout dual**:
  - *Efectivo*: teclado numérico + montos rápidos + calculadora de vuelto/cambio.
  - *QR Dinámico*: QR único por transacción (monto + referencia + timestamp) con expiración simulada.
- **Comprobante/ticket** imprimible con detalle de ítems, modificadores y método de pago (`src/components/receipt/Ticket.tsx`).
- **Apertura/cierre de caja** con cálculo de efectivo esperado vs. contado y diferencia (sobrante/faltante).
- **Auditoría de cajas** (admin): historial de sesiones con diferencias resaltadas.
- **Inventario básico**: stock por producto y por topping, alertas de stock bajo.
- **Reportes de venta**: total vendido, ticket promedio, productos más vendidos, desglose por método de pago.

## Empezar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Los datos (catálogo, ventas, cajas) se guardan en `localStorage`; usa el botón de logout o borra el storage del navegador para reiniciar la demo.

## Estructura

```
src/
  components/
    ui/        # Button, Card, Modal, Badge, Input, NumericKeypad
    layout/    # CashierShell (kiosko), AdminShell (sidebar)
    pos/       # ProductGrid, ModifierModal, CartPanel, CheckoutModal
    admin/     # ProductRow, ProductFormModal
    receipt/   # Ticket
  pages/       # LoginPage, POSPage, CashOpenPage, CashClosePage, admin/*
  store/       # zustand: auth, catalog, cart, register, sales
  data/seed.ts # catálogo y usuarios demo
  lib/         # utils (cn, formatCurrency), motion (variants Framer Motion)
  types/       # modelo de dominio
  config/app.ts# nombre de tienda, moneda, locale
```

## Adaptar a otro país/moneda

Edita `src/config/app.ts` (`locale`, `currency`, `currencySymbol`) — todo el formateo de precios pasa por `formatCurrency()` en `src/lib/utils.ts`.
