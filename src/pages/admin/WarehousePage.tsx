import { useState, useEffect } from 'react';
import { PackageSearch, History, Plus, Minus, Search, AlertTriangle, Trash2, Info } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCatalogStore } from '@/store/catalogStore';
import { useWarehouseStore } from '@/store/warehouseStore';
import { useAuthStore } from '@/store/authStore';
import { cn, uid } from '@/lib/utils';
import type { Product } from '@/types';

export default function WarehousePage() {
  const [tab, setTab] = useState<'inventory' | 'history'>('inventory');
  const products = useCatalogStore((s) => s.products);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const { movements, fetchMovements, recordMovement } = useWarehouseStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [search, setSearch] = useState('');

  const [adjustmentModal, setAdjustmentModal] = useState<{ open: boolean; product: Product | null; type: 'add' | 'subtract'; quantity: string; notes: string }>({
    open: false,
    product: null,
    type: 'add',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    if (tab === 'history') {
      fetchMovements();
    }
  }, [tab, fetchMovements]);

  // Solo productos que tienen asignada la sucursal 'bodega' o que ya tienen stock en bodega
  const bodegaProducts = products.filter(
    (p) => p.branchIds.includes('bodega') || (p.stockByBranch['bodega'] || 0) > 0
  );

  const filteredProducts = bodegaProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Productos con stock bajo en bodega (solo los que están registrados en bodega)
  const lowStockProducts = bodegaProducts.filter(
    (p) => (p.stockByBranch['bodega'] || 0) <= p.lowStockThreshold
  );
  const lowStockCount = lowStockProducts.length;

  async function handleAdjustSubmit() {
    if (!adjustmentModal.product || !adjustmentModal.quantity) return;
    const qty = parseInt(adjustmentModal.quantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    const delta = adjustmentModal.type === 'add' ? qty : -qty;

    // Si el producto no tiene bodega en branchIds, hay que añadirlo primero
    const product = adjustmentModal.product;
    if (!product.branchIds.includes('bodega')) {
      const newBranchIds = [...product.branchIds, 'bodega'];
      // Actualizar localmente via catalogStore
      const { upsertProduct } = useCatalogStore.getState();
      upsertProduct({ ...product, branchIds: newBranchIds });
    }

    adjustStock(product.id, 'bodega', delta);

    await recordMovement({
      id: uid('mov'),
      productId: product.id,
      branchId: 'bodega',
      quantityChange: delta,
      type: adjustmentModal.type === 'add' ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
      notes: adjustmentModal.notes || 'Ajuste manual desde panel de Bodega',
      userId: currentUser?.id || 'admin',
      createdAt: new Date().toISOString(),
    });

    setAdjustmentModal({ open: false, product: null, type: 'add', quantity: '', notes: '' });
  }

  async function handleResetToZero(product: Product, currentStock: number) {
    if (currentStock > 0) {
      adjustStock(product.id, 'bodega', -currentStock);
      await recordMovement({
        id: uid('mov'),
        productId: product.id,
        branchId: 'bodega',
        quantityChange: -currentStock,
        type: 'MANUAL_ADJUSTMENT',
        notes: 'Vaciado completo de stock (Reset a 0) antes de eliminar',
        userId: currentUser?.id || 'admin',
        createdAt: new Date().toISOString(),
      });
    }

    // Remover "bodega" de los branchIds del producto para que desaparezca
    const newBranchIds = product.branchIds.filter(id => id !== 'bodega');
    const { upsertProduct } = useCatalogStore.getState();
    upsertProduct({ ...product, branchIds: newBranchIds });
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <PackageSearch size={24} className="text-primary-500" /> Gestión de Bodega
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Control de inventario central. Aquí ves y gestionas el stock físico de bodega.
            </p>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2 border border-orange-200">
              <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
              <span className="text-sm font-bold text-orange-700">
                {lowStockCount} {lowStockCount === 1 ? 'producto' : 'productos'} con stock bajo en bodega
              </span>
            </div>
          )}
        </div>

        <div className="mb-6 flex rounded-full bg-cream-300 p-1 w-fit">
          <button
            onClick={() => setTab('inventory')}
            className={cn('flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer', tab === 'inventory' ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted')}
          >
            <PackageSearch size={16} /> Inventario
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn('flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer', tab === 'history' ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted')}
          >
            <History size={16} /> Historial / Kardex
          </button>
        </div>

        {tab === 'inventory' && (
          <div className="space-y-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
              <input
                type="text"
                placeholder="Buscar productos en bodega..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface py-2 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none"
              />
            </div>

            {/* Sección para agregar cualquier producto al inventario de bodega */}
            <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-4">
              <h2 className="font-display text-base font-bold text-ink mb-1 flex items-center gap-2">
                <Plus size={18} className="text-primary-600" />
                Ingresar nuevo producto a Bodega
              </h2>
              <p className="text-sm text-ink-muted mb-4">
                Si la bodega está vacía o quieres añadir algo nuevo, búscalo aquí.
              </p>
              {search.trim().length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto">
                  {products
                    .filter((p) => !p.branchIds.includes('bodega') && (p.stockByBranch['bodega'] || 0) === 0)
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setAdjustmentModal({ open: true, product: p, type: 'add', quantity: '', notes: '' })}
                        className="flex items-center justify-between p-3 rounded-xl border border-primary-200 bg-white hover:border-primary-400 hover:bg-primary-50 transition-colors text-left cursor-pointer shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-sm text-ink block">{p.name}</span>
                          <span className="text-xs text-ink-soft">{p.category}</span>
                        </div>
                        <Plus size={16} className="text-primary-500 flex-shrink-0" />
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-center p-4 text-sm text-ink-soft bg-white/50 rounded-lg border border-primary-100">
                  Escribe el nombre del producto en la barra de búsqueda de arriba para encontrarlo en el catálogo y poder ingresarlo a la bodega.
                </div>
              )}

            </div>

            <h2 className="font-display text-lg font-bold text-ink mt-8 mb-4">Inventario Actual en Bodega</h2>

            {filteredProducts.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="flex flex-col items-center gap-3 text-ink-muted">
                  <Info size={36} className="text-primary-300" />
                  <h3 className="font-display font-bold text-ink">No hay productos ingresados en Bodega</h3>
                  <p className="text-sm max-w-xs">
                    Usa la sección de arriba para ingresar stock por primera vez.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((p) => {
                  const stock = p.stockByBranch['bodega'] || 0;
                  const isLow = stock <= p.lowStockThreshold && stock > 0;
                  return (
                    <Card key={p.id} className="p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display font-bold text-ink">{p.name}</h3>
                        <p className="text-xs text-ink-muted">{p.category}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-2xl font-bold font-display tabular-nums", isLow ? 'text-orange-500' : stock === 0 ? 'text-red-500' : 'text-ink')}>
                            {stock}
                          </span>
                          <span className="text-xs text-ink-soft">uds</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAdjustmentModal({ open: true, product: p, type: 'subtract', quantity: '', notes: '' })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <button
                            onClick={() => setAdjustmentModal({ open: true, product: p, type: 'add', quantity: '', notes: '' })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 cursor-pointer transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleResetToZero(p, stock)}
                            title="Vaciar stock a 0"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Fin de bloque movido */}
          </div>
        )}

        {tab === 'history' && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-cream-100 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-ink-muted">Fecha</th>
                    <th className="py-3 px-4 font-semibold text-ink-muted">Producto</th>
                    <th className="py-3 px-4 font-semibold text-ink-muted">Movimiento</th>
                    <th className="py-3 px-4 font-semibold text-ink-muted">Motivo / Tipo</th>
                    <th className="py-3 px-4 font-semibold text-ink-muted">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-soft">No hay movimientos registrados en bodega</td>
                    </tr>
                  ) : (
                    movements.map((mov) => {
                      const prod = products.find(p => p.id === mov.productId);
                      return (
                        <tr key={mov.id}>
                          <td className="py-3 px-4 text-ink tabular-nums">
                            {mov.createdAt ? new Date(mov.createdAt).toLocaleString() : '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-ink">{prod?.name || 'Desconocido'}</td>
                          <td className="py-3 px-4">
                            <span className={cn("font-bold tabular-nums", mov.quantityChange > 0 ? "text-green-600" : "text-red-500")}>
                              {mov.quantityChange > 0 ? '+' : ''}{mov.quantityChange}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cream-300 text-ink-muted">
                              {mov.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-muted italic">{mov.notes || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Modal open={adjustmentModal.open} onClose={() => setAdjustmentModal(m => ({ ...m, open: false }))} title="Ajustar Stock de Bodega">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">
            Producto: <span className="text-primary-600">{adjustmentModal.product?.name}</span>
          </p>
          <div>
            <label className="text-xs font-bold text-ink-muted mb-1 block">Cantidad a {adjustmentModal.type === 'add' ? 'Ingresar a Bodega' : 'Retirar de Bodega'}</label>
            <input 
              type="number"
              min="1"
              value={adjustmentModal.quantity}
              onChange={(e) => setAdjustmentModal(m => ({ ...m, quantity: e.target.value }))}
              className="w-full p-2 border border-border rounded-lg bg-field text-ink focus:border-primary-400 focus:outline-none"
              placeholder="Ej: 10"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink-muted mb-1 block">Motivo o Notas (Opcional)</label>
            <textarea
              value={adjustmentModal.notes}
              onChange={(e) => setAdjustmentModal(m => ({ ...m, notes: e.target.value }))}
              className="w-full p-2 border border-border rounded-lg bg-field text-ink h-20 focus:border-primary-400 focus:outline-none"
              placeholder="Ej: Ingreso de nuevo lote"
            />
          </div>
          <div className="pt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAdjustmentModal(m => ({ ...m, open: false }))}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdjustSubmit} disabled={!adjustmentModal.quantity}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
