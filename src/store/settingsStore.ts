import { create } from 'zustand';
import { api } from '@/lib/api';

interface SettingsState {
  settings: Record<string, any>;
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: {},
  hydrated: false,
  fetchAll: async () => {
    try {
      const settings = await api.settings.get();
      set({ settings, hydrated: true });
    } catch (err) {
      console.error('No se pudo cargar la configuración:', err);
    }
  },
  updateSetting: async (key, value) => {
    try {
      const updated = await api.settings.update({ [key]: value });
      set({ settings: updated });
    } catch (err) {
      console.error('Error actualizando configuración:', err);
    }
  }
}));
