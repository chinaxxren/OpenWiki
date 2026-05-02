import { create } from "zustand";

export type NavigationTarget =
  | { type: "content"; contentIds: string[] }
  | { type: "wiki-page"; pageId: string };

interface PendingNavigation {
  id: number;
  target: NavigationTarget;
}

interface NavigationState {
  pendingNavigation: PendingNavigation | null;
  navigate: (target: NavigationTarget) => void;
  clearPendingNavigation: (id?: number) => void;
}

let navigationRequestId = 0;

export const useNavigationStore = create<NavigationState>((set) => ({
  pendingNavigation: null,
  navigate: (target) =>
    set({
      pendingNavigation: {
        id: ++navigationRequestId,
        target,
      },
    }),
  clearPendingNavigation: (id) =>
    set((state) => {
      if (!state.pendingNavigation) return state;
      if (id !== undefined && state.pendingNavigation.id !== id) return state;
      return { pendingNavigation: null };
    }),
}));
