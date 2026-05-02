import { create } from "zustand";
import type {
  ContentListDateRange,
  ContentListFilter,
} from "../services/contentListService";

interface ContentListQueryState {
  activeFilter: ContentListFilter;
  activeDateRange: ContentListDateRange;
  activeSensitiveFilterEnabled: boolean;
  setActiveQuery: (
    filter: ContentListFilter,
    dateRange: ContentListDateRange,
    sensitiveFilterEnabled: boolean,
  ) => void;
}

export const useContentListQueryStore = create<ContentListQueryState>((set) => ({
  activeFilter: "all",
  activeDateRange: "all",
  activeSensitiveFilterEnabled: false,

  setActiveQuery: (filter, dateRange, sensitiveFilterEnabled) =>
    set((state) => (
      state.activeFilter === filter
      && state.activeDateRange === dateRange
      && state.activeSensitiveFilterEnabled === sensitiveFilterEnabled
        ? state
        : {
            activeFilter: filter,
            activeDateRange: dateRange,
            activeSensitiveFilterEnabled: sensitiveFilterEnabled,
          }
    )),
}));
