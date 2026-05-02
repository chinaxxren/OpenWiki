import { useEffect, useState } from "react";
import { useNavigationStore } from "./stores/navigationStore";
import { getWikiPage } from "./services/wikiService";
import type { WikiPage } from "./types/wiki";

type TabId = "content" | "wiki" | "report" | "digest" | "datahub" | "settings";

interface UseAppNavigationEffectsOptions {
  closeAndResetSearch: (clearInput?: boolean) => void;
  switchTab: (newTab: TabId, highlightIds?: string[]) => void;
}

export function useAppNavigationEffects({
  closeAndResetSearch,
  switchTab,
}: UseAppNavigationEffectsOptions) {
  const pendingNavigation = useNavigationStore((s) => s.pendingNavigation);
  const clearPendingNavigation = useNavigationStore((s) => s.clearPendingNavigation);
  const [previewWikiPage, setPreviewWikiPage] = useState<WikiPage | null>(null);

  useEffect(() => {
    if (!pendingNavigation) return;

    const { id, target } = pendingNavigation;

    if (target.type === "content") {
      closeAndResetSearch(true);
      switchTab("content", target.contentIds);
      clearPendingNavigation(id);
      return;
    }

    clearPendingNavigation(id);
    let cancelled = false;
    void (async () => {
      try {
        const page = await getWikiPage(target.pageId);
        if (!cancelled && page) setPreviewWikiPage(page);
      } catch (err) {
        console.error("Failed to load wiki page for preview:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingNavigation, clearPendingNavigation, closeAndResetSearch, switchTab]);

  return {
    previewWikiPage,
    setPreviewWikiPage,
  };
}
