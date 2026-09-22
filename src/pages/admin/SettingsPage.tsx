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
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Shield size={20} className="text-accent-500" /> Permisos de Cajero
            </h2>
            <Card className="divide-y divide-border">
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="pr-4">
                  <p className="font-bold text-ink flex items-center gap-2">
                    <Camera size={18} className="text-primary-500" />
                    Venta por QR sin comprobante fotográfico
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Si está desactivado, el cajero puede registrar un pago por QR sin necesidad de subir la foto del comprobante.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={!requireQrPhoto} // If require_qr_photo is true, then "allow without photo" is false.
                    onChange={(e) => updateSetting('require_qr_photo', (!e.target.checked).toString())}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-cream-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:border-ink-soft dark:bg-ink-muted"></div>
                </label>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
