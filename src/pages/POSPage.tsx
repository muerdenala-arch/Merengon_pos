import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronUp, ShoppingCart } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { MobileCartDrawer } from '@/components/pos/MobileCartDrawer';
import { ModifierModal } from '@/components/pos/ModifierModal';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { Ticket } from '@/components/receipt/Ticket';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { formatCurrency } from '@/lib/utils';
import type { Payment, Product, Sale } from '@/types';

export default function POSPage() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const activeSession = useRegisterStore((s) => s.activeSession());
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const adjustToppingStock = useCatalogStore((s) => s.adjustToppingStock);
  const addSale = useSalesStore((s) => s.addSale);

  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  if (!activeSession) {
    return <Navigate to="/caja/apertura" replace />;
  }
  if (!currentBranchId) {
    return <Navigate to="/login" replace />;
  }

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  async function handleConfirmPayment(payment: Payment) {
    // A diferencia del resto de las acciones del store, addSale espera al servidor: el
    // número de ticket es correlativo y atómico entre dispositivos (ver salesStore).
    const sale = await addSale({
      items,
      subtotal: total,
      total,
      payment,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      registerSessionId: activeSession!.id,
      branchId: currentBranchId!,
      createdAt: new Date().toISOString(),
    });

    items.forEach((item) => {
      adjustStock(item.product.id, currentBranchId!, -item.quantity);
      item.modifiers.toppings.forEach((t) => adjustToppingStock(t.id, currentBranchId!, -item.quantity));
    });

    clearCart();
    setCartDrawerOpen(false);
    setCheckoutOpen(false);
    setCompletedSale(sale);
  }

  return (
    <CashierShell>
      {/* < lg: catálogo a pantalla completa, el carrito vive en el drawer inferior.
          >= lg: layout de dos columnas de siempre, carrito fijo a la derecha. */}
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <ProductGrid branchId={currentBranchId} onSelect={setModifierProduct} />
        <div className="hidden h-full min-h-0 lg:block">
          <CartPanel onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {/* Barra inferior fija con el resumen de la orden — abre el drawer, no cobra directo,
          así el cajero puede revisar/editar ítems antes de pasar a Cobrar. */}
      {items.length > 0 && !cartDrawerOpen && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCartDrawerOpen(true)}
          className="fixed inset-x-3 bottom-3 z-30 flex min-h-touch-lg items-center justify-between rounded-2xl bg-primary-500 px-5 text-white shadow-pop lg:hidden cursor-pointer"
        >
          <span className="flex items-center gap-2 font-display font-bold">
            <ShoppingCart size={19} />
            {count} ítem{count > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 font-display font-bold">
            {formatCurrency(total)}
            <span className="mx-1 h-4 w-px bg-white/40" />
            Ver orden
            <ChevronUp size={18} />
          </span>
        </motion.button>
      )}

      <MobileCartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onCheckout={() => {
          setCartDrawerOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <ModifierModal branchId={currentBranchId} product={modifierProduct} onClose={() => setModifierProduct(null)} />
      <CheckoutModal
        open={checkoutOpen}
        total={total}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleConfirmPayment}
      />
      <Ticket sale={completedSale} onClose={() => setCompletedSale(null)} />
    </CashierShell>
  );
}
