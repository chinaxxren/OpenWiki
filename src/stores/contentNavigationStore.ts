import { create } from "zustand";

interface ContentNavigationState {
  highlightedIds: string[];
  scrollToId: string | null;
  setHighlightedIds: (ids: string[]) => void;
  setScrollToId: (id: string | null) => void;
  clearHighlights: () => void;
}

export const useContentNavigationStore = create<ContentNavigationState>((set) => ({
  highlightedIds: [],
  scrollToId: null,

  setHighlightedIds: (ids) =>
    set((state) => {
      const nextScrollToId = ids[0] ?? null;
      const prevIds = state.highlightedIds;
      const sameIds = prevIds.length === ids.length && prevIds.every((value, index) => value === ids[index]);
      if (sameIds && state.scrollToId === nextScrollToId) return state;
      return { highlightedIds: ids, scrollToId: nextScrollToId };
    }),

  setScrollToId: (id) =>
    set((state) => (state.scrollToId === id ? state : { scrollToId: id })),

  clearHighlights: () =>
    set((state) => {
      if (state.highlightedIds.length === 0 && state.scrollToId === null) return state;
      return { highlightedIds: [], scrollToId: null };
    }),
}));
