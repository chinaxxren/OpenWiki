import { useEffect } from "react";
import type { CapturedContent } from "../../types/content";

interface UseContentListEffectsOptions {
  contents: CapturedContent[];
  scrollToId: string | null;
  highlightedIds: string[];
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  loadedContentIdSetRef: React.MutableRefObject<Set<string>>;
  setFilter: (value: "all" | "text" | "image" | "url" | "document") => void;
  setDateRange: (value: "all" | "today" | "week" | "half-month") => void;
  setScrollToId: (id: string | null) => void;
  clearHighlights: () => void;
}

export function useContentListEffects({
  contents,
  scrollToId,
  highlightedIds,
  cardRefs: cardRefsRef,
  loadedContentIdSetRef: loadedContentIdsRef,
  setFilter,
  setDateRange,
  setScrollToId,
  clearHighlights,
}: UseContentListEffectsOptions): void {
  useEffect(() => {
    const previousActiveIds = loadedContentIdsRef.current;
    const activeIds = new Set(contents.map((content) => content.id));
    loadedContentIdsRef.current = activeIds;
    for (const id of previousActiveIds) {
      if (!activeIds.has(id)) {
        delete cardRefsRef.current[id];
      }
    }
  }, [contents, cardRefsRef, loadedContentIdsRef]);

  useEffect(() => {
    if (!scrollToId) return;

    const resetTimer = setTimeout(() => {
      setFilter("all");
      setDateRange("all");
    }, 0);

    const scrollTimer = setTimeout(() => {
      const el = cardRefsRef.current[scrollToId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollToId(null);
      }
    }, 150);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(scrollTimer);
    };
  }, [scrollToId, cardRefsRef, setFilter, setDateRange, setScrollToId]);

  useEffect(() => {
    if (highlightedIds.length === 0) return;
    const timer = setTimeout(() => {
      clearHighlights();
    }, 4000);
    return () => clearTimeout(timer);
  }, [highlightedIds, clearHighlights]);
}
