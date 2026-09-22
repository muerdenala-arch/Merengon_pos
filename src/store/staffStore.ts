import { create } from 'zustand';
import { USERS } from '@/data/seed';
import type { Role, StaffStatus, User } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
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
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  addUser: (data: StaffFormData) => Promise<User>;
  updateUser: (id: string, data: Partial<StaffFormData>) => Promise<void>;
  toggleBlocked: (id: string) => void;
  resetPin: (id: string, pin: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>()((set, get) => ({
  users: USERS,
  hydrated: false,

  fetchAll: async () => {
    try {
      const users = await api.staff.list();
      set((state) => (state.hydrated && sameData(state.users, users) ? state : { users, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar el personal con el servidor:', err);
    }
  },

  // addUser/updateUser/resetPin NO son optimistas: el servidor puede rechazar el PIN por
  // duplicado (409) y, como ya no viaja ningún PIN existente al navegador (ver
  // GET /api/staff), no hay forma de detectar el choque ANTES de mandarlo — se espera la
  // respuesta real y se propaga el error para que el formulario lo muestre.
  addUser: async (data) => {
    const user: User = { ...data, id: uid('user'), status: 'activo', createdAt: new Date().toISOString() };
    const created = await api.staff.create(user);
    set((state) => ({ users: [...state.users, created] }));
    return created;
  },
  updateUser: async (id, data) => {
    const updated = await api.staff.update(id, data);
    set((state) => ({ users: state.users.map((u) => (u.id === id ? updated : u)) }));
  },
  toggleBlocked: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user || user.protected) return;
    const status: StaffStatus = user.status === 'activo' ? 'bloqueado' : 'activo';
    set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, status } : u)) }));
    api.staff.update(id, { status }).catch((err) => console.error('No se pudo actualizar el estado:', err));
  },
  resetPin: async (id, pin) => {
    await api.staff.update(id, { pin });
  },
  removeUser: async (id) => {
    // No optimista: el servidor puede rechazar el borrado (ej. tiene gastos registrados),
    // y si se quita de la lista antes de tiempo la UI muestra "eliminado" cuando en
    // realidad sigue en la base de datos (reaparecía confuso en el siguiente poll).
    await api.staff.remove(id);
    set((state) => ({ users: state.users.filter((u) => !(u.id === id && !u.protected)) }));
  },
}));
