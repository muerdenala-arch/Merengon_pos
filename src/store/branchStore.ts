import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BRANCHES } from '@/data/seed';
import type { Branch } from '@/types';
import { uid } from '@/lib/utils';

export interface BranchFormData {
  name: string;
  address: string;
  phone: string;
}

interface BranchState {
  branches: Branch[];
  /** Filtro global del panel admin: null = "Todas las sucursales". */
  adminFilterBranchId: string | null;
  setAdminFilterBranchId: (id: string | null) => void;
  addBranch: (data: BranchFormData) => Branch;
  updateBranch: (id: string, data: Partial<BranchFormData>) => void;
  toggleActive: (id: string) => void;
  activeBranches: () => Branch[];
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: BRANCHES,
      adminFilterBranchId: null,
      setAdminFilterBranchId: (id) => set({ adminFilterBranchId: id }),
      addBranch: (data) => {
        const branch: Branch = { ...data, id: uid('branch'), active: true };
        set((state) => ({ branches: [...state.branches, branch] }));
        return branch;
      },
      updateBranch: (id, data) =>
        set((state) => ({
          branches: state.branches.map((b) => (b.id === id ? { ...b, ...data } : b)),
        })),
      toggleActive: (id) =>
        set((state) => ({
          branches: state.branches.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
        })),
      activeBranches: () => get().branches.filter((b) => b.active),
    }),
    { name: 'pos-jugueria/branches' },
  ),
);
