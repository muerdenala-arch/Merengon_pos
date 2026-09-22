import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCatalogStore } from '@/store/catalogStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { uid } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface BodegaWithdrawalModalProps {
  open: boolean;
  onClose: () => void;
}

export function BodegaWithdrawalModal({ open, onClose }: BodegaWithdrawalModalProps) {
  const products = useCatalogStore((s) => s.products);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  const bodegaProducts = products.filter(p => (p.stockByBranch['bodega'] || 0) > 0);
  const filteredProducts = bodegaProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const maxStock = selectedProduct?.stockByBranch['bodega'] || 0;

  async function handleWithdraw() {
    if (!selectedProduct || !currentBranchId || !currentUser) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty > maxStock) return;

    setLoading(true);
    try {
      // 1. Restar de bodega localmente
      adjustStock(selectedProduct.id, 'bodega', -qty);
      // 2. Sumar a la sucursal actual localmente
      adjustStock(selectedProduct.id, currentBranchId, qty);

      // 3. Registrar movimiento en BD para bodega (Salida)
      await api.stockMovements.create({
        id: uid('mov'),
        productId: selectedProduct.id,
        branchId: 'bodega',
        quantityChange: -qty,
        type: 'MANUAL_ADJUSTMENT',
        notes: `Retiro hacia sucursal por ${currentUser.name}`,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      });

      // 4. Registrar movimiento en BD para sucursal (Entrada)
      await api.stockMovements.create({
        id: uid('mov'),
        productId: selectedProduct.id,
        branchId: currentBranchId,
        quantityChange: qty,
        type: 'RESTOCK',
        notes: `Ingreso desde bodega por ${currentUser.name}`,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      });

      onClose();
      setQuantity('');
      setSelectedProductId(null);
      setSearchTerm('');
    } catch (e) {
      console.error(e);
      alert('Hubo un error al registrar el retiro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Retirar de Bodega" size="md">
      <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <p className="text-sm text-ink-muted">Selecciona el producto y la cantidad que deseas transferir a tu sucursal.</p>
        
        <Input 
          placeholder="Buscar producto..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />

        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-white">
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProductId(p.id)}
              className={`flex justify-between items-center p-3 rounded-lg text-left transition-colors cursor-pointer ${
                selectedProductId === p.id ? 'bg-primary-50 border border-primary-300' : 'hover:bg-cream-100 border border-transparent'
              }`}
            >
              <span className="font-bold text-sm text-ink">{p.name}</span>
              <span className="text-xs text-ink-soft">Disp: {p.stockByBranch['bodega']}</span>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="p-4 text-center text-sm text-ink-muted">No hay productos disponibles en bodega.</div>
          )}
        </div>

        {selectedProduct && (
          <div className="flex flex-col gap-3 mt-4">
            <h3 className="font-bold text-ink flex items-center justify-between">
              <span>Retirando: {selectedProduct.name}</span>
            </h3>
            <Input 
              type="number" 
              label="Cantidad a retirar" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Máx. ${maxStock}`}
              max={maxStock}
              min={1}
            />
            
            <Button 
              className="mt-2 w-full !bg-primary-500 hover:!bg-primary-600 !text-white transition-colors cursor-pointer" 
              onClick={handleWithdraw} 
              disabled={loading || !quantity || parseInt(quantity, 10) > maxStock || parseInt(quantity, 10) <= 0}
            >
              {loading ? 'Procesando...' : 'Confirmar Retiro'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
