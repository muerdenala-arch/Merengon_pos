import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QrCode } from '@/types';
import { uid } from '@/lib/utils';

export interface QrCodeFormData {
  alias: string;
  bankOrHolder: string;
  image: string;
}

interface QrCodeState {
  qrCodes: QrCode[];
  addQrCode: (data: QrCodeFormData) => QrCode;
  updateQrCode: (id: string, data: Partial<QrCodeFormData>) => void;
  removeQrCode: (id: string) => void;
  setActive: (id: string) => void;
  activeQrCode: () => QrCode | null;
}

export const useQrCodeStore = create<QrCodeState>()(
  persist(
    (set, get) => ({
      qrCodes: [],
      addQrCode: (data) => {
        // El primer QR que se sube queda activo automáticamente (si no hay ninguno aún).
        const makeActive = get().qrCodes.length === 0;
        const qr: QrCode = { ...data, id: uid('qr'), active: makeActive, createdAt: new Date().toISOString() };
        set((state) => ({ qrCodes: [...state.qrCodes, qr] }));
        return qr;
      },
      updateQrCode: (id, data) =>
        set((state) => ({
          qrCodes: state.qrCodes.map((q) => (q.id === id ? { ...q, ...data } : q)),
        })),
      removeQrCode: (id) => set((state) => ({ qrCodes: state.qrCodes.filter((q) => q.id !== id) })),
      setActive: (id) =>
        set((state) => ({
          // Solo un QR puede estar activo a la vez: desactiva todos los demás.
          qrCodes: state.qrCodes.map((q) => ({ ...q, active: q.id === id })),
        })),
      activeQrCode: () => get().qrCodes.find((q) => q.active) ?? null,
    }),
    { name: 'pos-jugueria/qr-codes' },
  ),
);
