import { Search } from "lucide-react";
import { SearchDropdown } from "./SearchDropdown";
import type { WikiPage } from "./types/wiki";
import type { CapturedContent } from "./types/content";

type TabId = "content" | "wiki" | "report" | "digest" | "datahub" | "settings";

interface TabItem {
  id: TabId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppHeaderProps {
  activeTab: TabId;
  tabDefs: TabItem[];
  switchTab: (tab: TabId, highlightIds?: string[]) => void;
  t: (key: string) => string;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  searching: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  displayedWikiResults: WikiPage[];
  displayedContentResults: CapturedContent[];
  hasWikiResults: boolean;
  hasContentResults: boolean;
  handleSearchInputChange: (value: string) => void;
  resetSearchState: (clearInput?: boolean) => void;
}

export function AppHeader({
  activeTab,
  tabDefs,
  switchTab,
  t,
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
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/30 dark:bg-white/[0.03] backdrop-blur-xl border-b border-white/10 dark:border-white/[0.06]" data-tauri-drag-region>
      <div className="relative flex items-center pl-[78px] pr-4 h-[40px]" data-tauri-drag-region>
        <span className="text-base font-bold text-orange-500 flex-shrink-0" data-tauri-drag-region>
          OpenWiki
        </span>

        <nav className="absolute inset-0 flex items-center justify-center pointer-events-none" data-tauri-drag-region>
          <div className="inline-flex bg-gray-100/60 dark:bg-white/[0.06] rounded-md p-0.5 pointer-events-auto">
            {tabDefs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`
                    flex items-center gap-1 px-3 py-1 text-[13px] font-medium
                    rounded transition-all duration-200
                    ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-white/[0.15] text-orange-500 dark:text-orange-400 shadow-sm"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                    }
                  `}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1" data-tauri-drag-region />

        <div className="flex-shrink-0 relative">
          {searchOpen ? (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { handleSearchInputChange(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      resetSearchState(true);
                    }
                  }}
                  placeholder={t("action.search") + "..."}
                  className="w-48 px-2.5 py-1 text-xs border border-white/60 dark:border-white/[0.1] rounded-lg
                             bg-white/60 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200
                             placeholder-gray-400 dark:placeholder-slate-500
                             focus:border-orange-400/60 dark:focus:border-orange-500/40
                             outline-none transition-all"
                  autoFocus
                />
                {searchQuery.trim() && (
                  <SearchDropdown
                    searching={searching}
                    hasWikiResults={hasWikiResults}
                    hasContentResults={hasContentResults}
                    displayedWikiResults={displayedWikiResults}
                    displayedContentResults={displayedContentResults}
                    switchTab={switchTab}
                    setSearchOpen={setSearchOpen}
                    resetSearchState={resetSearchState}
                    t={t}
                  />
                )}
              </div>
              <button
                onClick={() => {
                  setSearchOpen(false);
                  resetSearchState(true);
                }}
                className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400
                         hover:bg-white/50 dark:hover:bg-white/[0.08] rounded-lg transition-all"
              title={t("action.search")}
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
