import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { USERS } from '@/data/seed';
import type { Role, StaffStatus, User } from '@/types';
import { uid } from '@/lib/utils';

export interface StaffFormData {
  name: string;
  role: Role;
  pin: string;
  color: string;
  branchIds: string[];
}

interface StaffState {
  users: User[];
  addUser: (data: StaffFormData) => User;
  updateUser: (id: string, data: StaffFormData) => void;
  toggleBlocked: (id: string) => void;
  resetPin: (id: string, pin: string) => void;
  removeUser: (id: string) => void;
  isPinTaken: (pin: string, excludeId?: string) => boolean;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      users: USERS,
      addUser: (data) => {
        const user: User = {
          ...data,
          id: uid('user'),
          status: 'activo',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));
        return user;
      },
      updateUser: (id, data) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        })),
      toggleBlocked: (id) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id && !u.protected
              ? { ...u, status: u.status === 'activo' ? 'bloqueado' : ('activo' as StaffStatus) }
              : u,
          ),
        })),
      resetPin: (id, pin) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, pin } : u)),
        })),
      removeUser: (id) =>
        set((state) => ({
          // Nunca elimina al administrador principal, aunque coincida el id.
          users: state.users.filter((u) => !(u.id === id && !u.protected)),
        })),
      isPinTaken: (pin, excludeId) => get().users.some((u) => u.pin === pin && u.id !== excludeId),
    }),
    {
      name: 'pos-jugueria/staff',
      version: 1,
      // v0 -> v1: el personal no tenía sucursales asignadas. Se les da acceso a todas
      // para no dejar a nadie bloqueado fuera del sistema tras la actualización.
      migrate: (persisted) => {
        const state = persisted as { users?: Array<Record<string, unknown>> };
        return {
          ...state,
          users: (state.users ?? []).map((u) =>
            'branchIds' in u ? u : { ...u, branchIds: ['central', 'norte', 'sur'] },
          ),
        };
      },
    },
  ),
);
