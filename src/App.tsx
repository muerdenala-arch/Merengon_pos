import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/router/RequireAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeEffect } from '@/hooks/useThemeEffect';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CashOpenPage from '@/pages/CashOpenPage';
import CashClosePage from '@/pages/CashClosePage';
import CatalogPage from '@/pages/admin/CatalogPage';
import InventoryPage from '@/pages/admin/InventoryPage';
import CashAuditPage from '@/pages/admin/CashAuditPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import StaffPage from '@/pages/admin/StaffPage';
import QrConfigPage from '@/pages/admin/QrConfigPage';
import BranchesPage from '@/pages/admin/BranchesPage';

export default function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  useThemeEffect();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/pos"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <POSPage />
          </RequireAuth>
        }
      />
      <Route
        path="/caja/apertura"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <CashOpenPage />
          </RequireAuth>
        }
      />
      <Route
        path="/caja/cierre"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <CashClosePage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/catalogo"
        element={
          <RequireAuth roles={['admin']}>
            <CatalogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/inventario"
        element={
          <RequireAuth roles={['admin']}>
            <InventoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/personal"
        element={
          <RequireAuth roles={['admin']}>
            <StaffPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/configuracion-qr"
        element={
          <RequireAuth roles={['admin']}>
            <QrConfigPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sucursales"
        element={
          <RequireAuth roles={['admin']}>
            <BranchesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/auditoria"
        element={
          <RequireAuth roles={['admin']}>
            <CashAuditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <RequireAuth roles={['admin']}>
            <ReportsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/"
        element={
          <Navigate to={currentUser ? (currentUser.role === 'admin' ? '/admin/reportes' : '/pos') : '/login'} replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
