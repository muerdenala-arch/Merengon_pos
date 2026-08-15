import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QrCode } from '@/types';
import { uid } from '@/lib/utils';

export interface QrCodeFormData {
  alias: string;
  bankOrHolder: string;
  image: string;
  branchId: string;
}

interface QrCodeState {
  qrCodes: QrCode[];
  addQrCode: (data: QrCodeFormData) => QrCode;
  updateQrCode: (id: string, data: Partial<QrCodeFormData>) => void;
  removeQrCode: (id: string) => void;
  setActive: (id: string) => void;
  qrCodesForBranch: (branchId: string) => QrCode[];
  activeQrCodeForBranch: (branchId: string) => QrCode | null;
}

export const useQrCodeStore = create<QrCodeState>()(
  persist(
    (set, get) => ({
      qrCodes: [],
      addQrCode: (data) => {
        // El primer QR que se sube a una sucursal queda activo automáticamente ahí.
        const hasActiveInBranch = get().qrCodes.some((q) => q.branchId === data.branchId && q.active);
        const qr: QrCode = { ...data, id: uid('qr'), active: !hasActiveInBranch, createdAt: new Date().toISOString() };
        set((state) => ({ qrCodes: [...state.qrCodes, qr] }));
        return qr;
      },
      updateQrCode: (id, data) =>
        set((state) => ({
          qrCodes: state.qrCodes.map((q) => (q.id === id ? { ...q, ...data } : q)),
        })),
      removeQrCode: (id) => set((state) => ({ qrCodes: state.qrCodes.filter((q) => q.id !== id) })),
      setActive: (id) =>
        set((state) => {
          const target = state.qrCodes.find((q) => q.id === id);
          if (!target) return state;
          // Solo un QR activo a la vez, pero por sucursal — activar uno en "Norte" no
          // desactiva el de "Central".
          return {
            qrCodes: state.qrCodes.map((q) =>
              q.branchId === target.branchId ? { ...q, active: q.id === id } : q,
            ),
          };
        }),
      qrCodesForBranch: (branchId) => get().qrCodes.filter((q) => q.branchId === branchId),
      activeQrCodeForBranch: (branchId) =>
        get().qrCodes.find((q) => q.branchId === branchId && q.active) ?? null,
    }),
    {
      name: 'pos-jugueria/qr-codes',
      version: 1,
      // v0 -> v1: los QR no tenían sucursal. Se asignan a "central" para conservar los
      // que ya se habían subido antes de esta actualización.
      migrate: (persisted) => {
        const state = persisted as { qrCodes?: Array<Record<string, unknown>> };
        return {
          ...state,
          qrCodes: (state.qrCodes ?? []).map((q) => ('branchId' in q ? q : { ...q, branchId: 'central' })),
        };
      },
    },
  ),
);
