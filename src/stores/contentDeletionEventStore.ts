import { create } from "zustand";
import type { CapturedContent } from "../types/content";

interface ContentDeletionEventState {
  lastDeletedContent: CapturedContent | null;
  lastDeletedContentVersion: number;
  publishDeletedContent: (content: CapturedContent) => void;
}

export const useContentDeletionEventStore = create<ContentDeletionEventState>((set) => ({
  lastDeletedContent: null,
  lastDeletedContentVersion: 0,

  publishDeletedContent: (content) =>
    set((state) => ({
      lastDeletedContent: content,
      lastDeletedContentVersion: state.lastDeletedContentVersion + 1,
    })),
}));
