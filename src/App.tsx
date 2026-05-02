import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { UpdateBanner } from "./features/update/UpdateBanner";
import { PreAuthModal } from "./features/automation/PreAuthModal";
import { AutomationNotices } from "./features/automation/AutomationNotices";
import { useContentNavigationStore } from "./stores/contentNavigationStore";
import { useWikiStore } from "./stores/wikiStore";
import { MainTabs } from "./AppTabs";
import { TAB_DEFS } from "./appTabsConfig";
import { useAppBootstrap } from "./useAppBootstrap";
import { useAppNavigationEffects } from "./useAppNavigationEffects";
import { useAppSearch } from "./useAppSearch";
import { useTabNavigation } from "./useTabNavigation";
import { AppHeader } from "./AppHeader";
// FloatingBubble is now a separate system-level window (see BubbleView.tsx)
const LazyWikiPageDetail = lazy(async () => {
  const [{ ensureI18nNamespaces }, m] = await Promise.all([
    import("./i18n"),
    import("./features/wiki/WikiPageDetail"),
  ]);
  await ensureI18nNamespaces(["wiki"]);
  return { default: m.WikiPageDetail };
});

function App() {
  const { t } = useTranslation();
  const setHighlightedIds = useContentNavigationStore((s) => s.setHighlightedIds);
  const deleteWikiPageInStore = useWikiStore((s) => s.deletePage);
  useAppBootstrap();
  const {
    searchOpen,
    setSearchOpen,
    searchQuery,
    searching,
    searchInputRef,
    displayedWikiResults,
    displayedContentResults,
    hasWikiResults,
    hasContentResults,
    handleSearchInputChange,
    resetSearchState,
    closeAndResetSearch,
  } = useAppSearch();
  const {
    activeTab,
    mountedTabs: tabMountedTabs,
    switchTab,
  } = useTabNavigation({ setHighlightedIds });
  const { previewWikiPage, setPreviewWikiPage } = useAppNavigationEffects({
    closeAndResetSearch,
    switchTab,
  });
  const mountedTabs = tabMountedTabs;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FAFAF8] dark:bg-[#0C0A09] transition-colors duration-300">
      <AppHeader
        activeTab={activeTab}
        tabDefs={TAB_DEFS}
        switchTab={switchTab}
        t={t}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        searching={searching}
        searchInputRef={searchInputRef}
        displayedWikiResults={displayedWikiResults}
        displayedContentResults={displayedContentResults}
        hasWikiResults={hasWikiResults}
        hasContentResults={hasContentResults}
        handleSearchInputChange={handleSearchInputChange}
        resetSearchState={resetSearchState}
      />

      {/* Update available — shown when backend emits `update-available` on startup */}
      <UpdateBanner />

      {/* Automation permission denial banner + grant/dismiss toasts */}
      <AutomationNotices />

      {/* Tab content — relative z-index above orbs.
          All tabs stay mounted (toggled via CSS `display`) so their state
          — open chat sessions, scroll positions, form input, filter
          selections, etc. — persists across tab switches. Originally
          conditional-rendered, which wiped e.g. the WikiAskSidebar chat
          every time the user glanced at the Content tab. Scanned for
          persistent intervals / polling / global keyboard handlers
          before the switch; none exist on these tabs, so the cost of
          keeping all six mounted is just React reconciliation overhead
          (negligible at ~150 wiki pages). */}
      <MainTabs activeTab={activeTab} mountedTabs={mountedTabs} loadingText={t("action.loading")} />

      {/* Wiki page detail overlay — shown when user clicks a knowledge tag
          on a content card. Lets them peek the linked wiki page without
          leaving the current tab. */}
      {previewWikiPage && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/10" />}>
          <LazyWikiPageDetail
            page={previewWikiPage}
            onClose={() => setPreviewWikiPage(null)}
            onDelete={async (id) => {
              await deleteWikiPageInStore(id);
              setPreviewWikiPage(null);
            }}
            onNavigateToContent={(contentId) => {
              setPreviewWikiPage(null);
              switchTab("content", [contentId]);
            }}
          />
        </Suspense>
      )}

      {/* First-launch Automation permission modal — fullscreen overlay */}
      <PreAuthModal />

      {/* Floating bubble is now a separate always-on-top window (BubbleView) */}
    </div>
  );
}

export default App;
