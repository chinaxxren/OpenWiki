import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { checkXReaderStatus, type XReaderStatus } from "../services/settingsService";

interface DiagnosticsState {
  totalItems: number;
  diskUsageMB: number;
  xreaderStatus: XReaderStatus | null;
  refreshStorageInfo: () => Promise<void>;
  loadXReaderStatus: () => Promise<void>;
  setStorageInfo: (totalItems: number, diskUsageMB: number) => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  totalItems: 0,
  diskUsageMB: 0,
  xreaderStatus: null,

  refreshStorageInfo: async () => {
    try {
      const info = await invoke<{ total_items: number; disk_usage_mb: number }>("get_storage_info");
      set({ totalItems: info.total_items, diskUsageMB: info.disk_usage_mb });
    } catch (e) {
      console.error("Failed to load storage info:", e);
    }
  },

  loadXReaderStatus: async () => {
    try {
      const status = await checkXReaderStatus();
      set({ xreaderStatus: status });
    } catch (e) {
      console.error("Failed to load x-reader status:", e);
    }
  },

  setStorageInfo: (totalItems, diskUsageMB) => set({ totalItems, diskUsageMB }),
}));
