import { create } from "zustand";
import {
  loadEntityBackedContents,
  syncEntityBackedContents,
} from "../services/entityBackedContentService";
import {
  generateReportScreen,
  loadInitialReportSelection,
  loadReportScreen,
} from "../services/reportContentService";
import type { WeeklyReport, ReportSummary } from "../types/report";

interface ReportState {
  currentReport: WeeklyReport | null;
  reportList: ReportSummary[];
  weekContentIds: string[];
  isGenerating: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  loadReportByWeekStart: (weekStart: string) => Promise<void>;
  generateCurrentReport: () => Promise<void>;
  clearWeekContent: () => void;
  applyDeletedContent: (id: string) => void;
  setError: (error: string | null) => void;
}

export const useReportStore = create<ReportState>((set, get) => {
  const syncWeekContents = (contents: Parameters<typeof syncEntityBackedContents>[0]) => {
    set({ weekContentIds: syncEntityBackedContents(contents) });
  };

  return {
    currentReport: null,
    reportList: [],
    weekContentIds: [],
    isGenerating: false,
    error: null,

    bootstrap: async () => {
      try {
        const selection = await loadInitialReportSelection(get().currentReport?.week_start ?? null);
        set({ reportList: selection.reportList });
        if (
          selection.selectedWeekStart &&
          selection.selectedWeekStart !== get().currentReport?.week_start
        ) {
          await get().loadReportByWeekStart(selection.selectedWeekStart);
        }
      } catch (e) {
        console.error("Failed to load report list:", e);
      }
    },

    loadReportByWeekStart: async (weekStart) => {
      try {
        set({ error: null });
        const { result: reportData, contentIds } = await loadEntityBackedContents({
          load: () => loadReportScreen(weekStart),
          selectContents: (result) => result.weekContents,
        });
        set({ currentReport: reportData.report, weekContentIds: contentIds });
      } catch (e) {
        console.error("Failed to load report:", e);
        set({ error: "loadFailed" });
        throw e;
      }
    },

    generateCurrentReport: async () => {
      if (get().isGenerating) return;
      set({ isGenerating: true, error: null });
      try {
        const generated = await generateReportScreen();
        syncWeekContents(generated.weekContents);
        set({
          currentReport: generated.report,
          reportList: generated.reportList,
          isGenerating: false,
        });
      } catch (e) {
        console.error("Failed to generate report:", e);
        set({ isGenerating: false, error: "generateFailed" });
        throw e;
      }
    },

    clearWeekContent: () => set((state) => (
      state.weekContentIds.length === 0 ? state : { weekContentIds: [] }
    )),

    applyDeletedContent: (id) => set((state) => ({
      weekContentIds: state.weekContentIds.filter((currentId) => currentId !== id),
    })),

    setError: (error) => set({ error }),
  };
});
