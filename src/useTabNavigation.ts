import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

type TabId = "content" | "wiki" | "report" | "digest" | "datahub" | "settings";

interface UseTabNavigationOptions {
  setHighlightedIds: (ids: string[]) => void;
}

export function useTabNavigation({ setHighlightedIds }: UseTabNavigationOptions) {
  const [activeTab, setActiveTab] = useState<TabId>("content");
  const activeTabRef = useRef<TabId>("content");
  const [mountedTabs, setMountedTabs] = useState<Record<TabId, boolean>>({
    content: true,
    wiki: false,
    report: false,
    digest: false,
    datahub: false,
    settings: false,
  });

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const scrollPositions = useRef<Record<TabId, number>>({
    content: 0,
    wiki: 0,
    report: 0,
    digest: 0,
    datahub: 0,
    settings: 0,
  });

  const switchTab = useCallback(
    (newTab: TabId, highlightIds?: string[]) => {
      const currentTab = activeTabRef.current;
      const shouldHighlight = newTab === "content" && !!highlightIds && highlightIds.length > 0;
      if (newTab === currentTab && !shouldHighlight) return;

      scrollPositions.current[currentTab] = window.scrollY;

      if (shouldHighlight) {
        setHighlightedIds(highlightIds);
      }

      setMountedTabs((prev) => (prev[newTab] ? prev : { ...prev, [newTab]: true }));
      setActiveTab((prev) => (prev === newTab ? prev : newTab));
      activeTabRef.current = newTab;

      if (!shouldHighlight) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositions.current[newTab]);
        });
      }
    },
    [setHighlightedIds]
  );

  useEffect(() => {
    const unlisten = listen<string>("navigate-tab", (event) => {
      const tab = event.payload as TabId;
      if (["content", "wiki", "report", "digest", "datahub", "settings"].includes(tab)) {
        switchTab(tab as TabId);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [switchTab]);

  return {
    activeTab,
    mountedTabs,
    switchTab,
  };
}
