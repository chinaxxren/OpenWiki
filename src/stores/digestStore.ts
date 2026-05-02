import { create } from "zustand";
import {
  getDigestItems,
  digestItem,
  type DigestAction,
} from "../services/digestService";
import { loadEntityBackedContents } from "../services/entityBackedContentService";

interface DigestState {
  itemIds: string[];
  remaining: number;
  isLoading: boolean;
  dailyTarget: number;
  digestedToday: number;
  error: string | null;

  loadItems: () => Promise<void>;
  doDigest: (id: string, action: DigestAction) => Promise<void>;
  applyDeletedContent: (id: string) => void;
}

export const useDigestStore = create<DigestState>((set, get) => ({
  itemIds: [],
  remaining: 0,
  isLoading: false,
  dailyTarget: 5,
  digestedToday: 0,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { result: resp, contentIds } = await loadEntityBackedContents({
        load: getDigestItems,
        selectContents: (result) => result.items,
      });
      set({
        itemIds: contentIds,
        remaining: resp.remaining,
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  doDigest: async (id: string, action: DigestAction) => {
    try {
      await digestItem(id, action);
      const { itemIds, digestedToday, remaining } = get();
      set({
        itemIds: itemIds.filter((currentId) => currentId !== id),
        digestedToday: digestedToday + 1,
        remaining: Math.max(0, remaining - 1),
        error: null,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  applyDeletedContent: (id: string) => {
    const { itemIds } = get();
    if (!itemIds.includes(id)) return;
    set((state) => ({
      itemIds: state.itemIds.filter((currentId) => currentId !== id),
      remaining: Math.max(0, state.remaining - 1),
    }));
  },
}));
