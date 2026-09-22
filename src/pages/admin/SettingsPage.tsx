import { useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Camera } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsPage() {
  const { settings, fetchAll, updateSetting } = useSettingsStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const requireQrPhoto = settings.require_qr_photo === 'true' || settings.require_qr_photo === true;

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <SettingsIcon size={24} className="text-primary-500" /> Configuración Global
          </h1>
          <p className="text-sm text-ink-muted">Ajustes generales del sistema y permisos de cajeros</p>
        </div>

        <div className="space-y-6">
          <Card className="p-8 text-center text-ink-muted">
            No hay configuraciones globales disponibles por ahora.
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
