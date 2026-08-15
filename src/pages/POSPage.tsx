import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { ModifierModal } from '@/components/pos/ModifierModal';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { Ticket } from '@/components/receipt/Ticket';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import type { Payment, Product, Sale } from '@/types';

export default function POSPage() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const activeSession = useRegisterStore((s) => s.activeSession());
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const adjustToppingStock = useCatalogStore((s) => s.adjustToppingStock);
  const addSale = useSalesStore((s) => s.addSale);

  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  if (!activeSession) {
    return <Navigate to="/caja/apertura" replace />;
  }

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  function handleConfirmPayment(payment: Payment) {
    const sale = addSale({
      items,
      subtotal: total,
      total,
      payment,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      registerSessionId: activeSession!.id,
      createdAt: new Date().toISOString(),
    });

    items.forEach((item) => {
      adjustStock(item.product.id, -item.quantity);
      item.modifiers.toppings.forEach((t) => adjustToppingStock(t.id, -item.quantity));
    });

    clearCart();
    setCheckoutOpen(false);
    setCompletedSale(sale);
  }

  return (
    <CashierShell>
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[1fr_380px]">
        <ProductGrid onSelect={setModifierProduct} />
        <div className="hidden h-full min-h-0 md:block">
          <CartPanel onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {/* Barra flotante de carrito en móvil */}
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-3 bottom-3 md:hidden"
        >
          <Button size="lg" className="w-full shadow-pop" onClick={() => setCheckoutOpen(true)}>
            <Lock size={18} /> Cobrar · {items.length} ítem{items.length > 1 ? 's' : ''}
          </Button>
        </motion.div>
      )}

      <ModifierModal product={modifierProduct} onClose={() => setModifierProduct(null)} />
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
