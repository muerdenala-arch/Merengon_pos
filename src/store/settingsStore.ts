import { create } from 'zustand';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';

interface SettingsState {
  settings: Record<string, unknown>;
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: {},
  hydrated: false,
  fetchAll: async () => {
    try {
      const settings = await api.settings.get();
      set((state) => (state.hydrated && sameData(state.settings, settings) ? state : { settings, hydrated: true }));
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
