import { create } from "zustand";
import {
  type MonthGroup,
  loadDataHubDayContents,
  loadDataHubExportDir,
  loadDataHubSidebarData,
} from "../services/dataHubContentService";
import { loadEntityBackedContents } from "../services/entityBackedContentService";

interface DataHubState {
  selectedDate: string | null;
  monthGroups: MonthGroup[];
  dayContentIds: string[];
  isLoading: boolean;
  exportDir: string;
  totalDates: number;
  totalItems: number;

  selectDate: (date: string) => Promise<void>;
  toggleMonth: (month: string) => void;
  loadDateList: () => Promise<void>;
  loadExportDir: () => Promise<void>;
  applyDeletedContent: (content: { id: string; captured_at: string }) => void;
}

export const useDataHubStore = create<DataHubState>((set) => ({
  selectedDate: null,
  monthGroups: [],
  dayContentIds: [],
  isLoading: false,
  exportDir: "",
  totalDates: 0,
  totalItems: 0,

  selectDate: async (date: string) => {
    set({ selectedDate: date, isLoading: true });
    try {
      const { contentIds } = await loadEntityBackedContents({
        load: () => loadDataHubDayContents(date),
        selectContents: (contents) => contents,
      });
      set({ dayContentIds: contentIds, isLoading: false });
    } catch (e) {
      console.error("Failed to load content for date:", e);
      set({ dayContentIds: [], isLoading: false });
    }
  },

  toggleMonth: (month: string) => {
    set((state) => ({
      monthGroups: state.monthGroups.map((g) =>
        g.month === month ? { ...g, expanded: !g.expanded } : g
      ),
    }));
  },

  loadDateList: async () => {
    try {
      const sidebarData = await loadDataHubSidebarData();
      set(sidebarData);
    } catch (e) {
      console.error("Failed to load date list:", e);
    }
  },

  loadExportDir: async () => {
    try {
      const dir = await loadDataHubExportDir();
      set({ exportDir: dir });
    } catch (e) {
      console.error("Failed to load export dir:", e);
    }
  },

  applyDeletedContent: ({ id, captured_at }) => set((state) => {
    const dayKey = captured_at.slice(0, 10);
    const nextMonthGroups = state.monthGroups
      .map((group) => {
        let changed = false;
        const nextDates = group.dates
          .map((entry) => {
            if (entry.date !== dayKey) return entry;
            changed = true;
            const nextCount = Math.max(0, entry.count - 1);
            if (nextCount === 0) {
              return null;
            }
            return { ...entry, count: nextCount };
          })
          .filter(Boolean) as typeof group.dates;

        if (!changed) return group;
        if (nextDates.length === 0) {
          return null;
        }

        return {
          ...group,
          dates: nextDates,
          totalCount: Math.max(0, group.totalCount - 1),
        };
      })
      .filter(Boolean) as typeof state.monthGroups;

    const nextDayContentIds = state.dayContentIds.filter((currentId) => currentId !== id);

    const selectedDateStillExists = state.selectedDate
      ? nextMonthGroups.some((group) => group.dates.some((entry) => entry.date === state.selectedDate))
      : false;

    return {
      monthGroups: nextMonthGroups,
      dayContentIds: nextDayContentIds,
      totalItems: Math.max(0, state.totalItems - 1),
      totalDates: nextMonthGroups.reduce((sum, group) => sum + group.dates.length, 0),
      selectedDate: selectedDateStillExists ? state.selectedDate : null,
    };
  }),
}));
