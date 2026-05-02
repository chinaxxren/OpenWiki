import { create } from "zustand";
import type { CapturedContent } from "../types/content";
import {
  didCapturedContentChange,
  useContentEntitiesStore,
} from "./contentEntitiesStore";

interface ContentState {
  contentIds: string[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  setContents: (contents: CapturedContent[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setHasMore: (v: boolean) => void;
  setTotalCount: (n: number) => void;
  addContent: (content: CapturedContent) => void;
  appendContents: (items: CapturedContent[]) => void;
  removeContent: (id: string) => void;
  applyDeletedContent: (
    id: string,
    options?: { decrementTotalCount?: boolean },
  ) => void;
  updateContent: (updated: CapturedContent) => void;
  updateContents: (updatedList: CapturedContent[]) => void;
}

export const useContentStore = create<ContentState>((set) => {
  const contentIdSet = new Set<string>();
  const upsertOne = (content: CapturedContent) => useContentEntitiesStore.getState().upsertOne(content);
  const upsertMany = (contents: CapturedContent[]) => useContentEntitiesStore.getState().upsertMany(contents);
  const removeEntity = (id: string) => useContentEntitiesStore.getState().removeOne(id);

  function replaceContentIds(contents: CapturedContent[]) {
    contentIdSet.clear();
    for (const content of contents) {
      contentIdSet.add(content.id);
    }
  }

  return {
    contentIds: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    totalCount: 0,
    setContents: (contents) =>
      set((state) => {
        upsertMany(contents);
        const nextIds = contents.map((content) => content.id);
        const sameIds = state.contentIds.length === nextIds.length
          && state.contentIds.every((id, index) => id === nextIds[index]);
        if (sameIds) return state;
        replaceContentIds(contents);
        return { contentIds: nextIds };
      }),
    setIsLoading: (loading) =>
      set((state) => (state.isLoading === loading ? state : { isLoading: loading })),
    setIsLoadingMore: (loading) =>
      set((state) => (state.isLoadingMore === loading ? state : { isLoadingMore: loading })),
    setHasMore: (v) =>
      set((state) => (state.hasMore === v ? state : { hasMore: v })),
    setTotalCount: (n) =>
      set((state) => (state.totalCount === n ? state : { totalCount: n })),
    addContent: (content) =>
      set((state) => {
        if (contentIdSet.has(content.id)) return state;
        contentIdSet.add(content.id);
        upsertOne(content);
        return { contentIds: [content.id, ...state.contentIds] };
      }),
    appendContents: (items) =>
      set((state) => {
        if (items.length === 0) return state;
        upsertMany(items);
        const newItems: CapturedContent[] = [];
        for (const item of items) {
          if (contentIdSet.has(item.id)) continue;
          contentIdSet.add(item.id);
          newItems.push(item);
        }
        if (newItems.length === 0) return state;
        return { contentIds: [...state.contentIds, ...newItems.map((item) => item.id)] };
      }),
    removeContent: (id) =>
      set((state) => {
        if (!contentIdSet.has(id)) return state;
        const idx = state.contentIds.findIndex((currentId) => currentId === id);
        if (idx < 0) return state;
        contentIdSet.delete(id);
        removeEntity(id);
        if (state.contentIds.length === 1) {
          return { contentIds: [] };
        }
        const nextIds = state.contentIds.slice();
        nextIds.splice(idx, 1);
        return { contentIds: nextIds };
      }),
    applyDeletedContent: (id, options) =>
      set((state) => {
        const shouldDecrementTotal = options?.decrementTotalCount ?? true;
        const idx = state.contentIds.findIndex((currentId) => currentId === id);
        const hasContent = idx >= 0;
        if (!hasContent && !shouldDecrementTotal) return state;

        const nextState: Partial<ContentState> = {};
        let nextContentIds = state.contentIds;
        if (hasContent) {
          contentIdSet.delete(id);
          nextContentIds =
            state.contentIds.length === 1
              ? []
              : state.contentIds.filter((currentId) => currentId !== id);
          nextState.contentIds = nextContentIds;
        }
        const nextTotalCount = shouldDecrementTotal
          ? Math.max(0, state.totalCount - 1)
          : state.totalCount;
        if (shouldDecrementTotal && state.totalCount > 0) {
          nextState.totalCount = nextTotalCount;
          nextState.hasMore = nextTotalCount > nextContentIds.length;
        }
        return nextState;
      }),
    updateContent: (updated) =>
      set((state) => {
        const idx = state.contentIds.findIndex((id) => id === updated.id);
        if (idx < 0) return state;
        const prev = useContentEntitiesStore.getState().entities[updated.id];
        if (!prev) return state;
        if (!didCapturedContentChange(prev, updated)) return state;
        upsertOne(updated);
        return state;
      }),
    updateContents: (updatedList) =>
      set((state) => {
        if (updatedList.length === 0) return state;
        upsertMany(updatedList);
        if (updatedList.length === 1) {
          const target = updatedList[0];
          const idx = state.contentIds.findIndex((id) => id === target.id);
          if (idx < 0) return state;
          const prev = useContentEntitiesStore.getState().entities[target.id];
          if (!prev) return state;
          if (!didCapturedContentChange(prev, target)) return state;
          return state;
        }

        const updatedById = new Map(updatedList.map((item) => [item.id, item]));
        if (updatedById.size === 0) return state;
        const pendingIds = new Set(updatedById.keys());

        for (let i = 0; i < state.contentIds.length && pendingIds.size > 0; i += 1) {
          const currentId = state.contentIds[i];
          const current = useContentEntitiesStore.getState().entities[currentId];
          const updated = updatedById.get(currentId);
          if (!updated) continue;
          pendingIds.delete(currentId);
          if (!current || !didCapturedContentChange(current, updated)) continue;
        }
        return state;
      }),
  };
});
