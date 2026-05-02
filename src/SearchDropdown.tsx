import { BookOpen, FileText, Image as ImageIcon, Link2 } from "lucide-react";
import { useWikiStore } from "./stores/wikiStore";
import type { WikiPage } from "./types/wiki";
import type { CapturedContent } from "./types/content";

type TabId = "content" | "wiki" | "report" | "digest" | "datahub" | "settings";

interface SearchDropdownProps {
  searching: boolean;
  hasWikiResults: boolean;
  hasContentResults: boolean;
  displayedWikiResults: WikiPage[];
  displayedContentResults: CapturedContent[];
  switchTab: (tab: TabId, highlightIds?: string[]) => void;
  setSearchOpen: (open: boolean) => void;
  resetSearchState: (clearInput?: boolean) => void;
  t: (key: string) => string;
}

export function SearchDropdown({
  searching,
  hasWikiResults,
  hasContentResults,
  displayedWikiResults,
  displayedContentResults,
  switchTab,
  setSearchOpen,
  resetSearchState,
  t,
}: SearchDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-1.5 w-80 max-h-72 overflow-y-auto
                    bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl
                    border border-white/60 dark:border-white/[0.1]
                    rounded-xl shadow-lg z-50">
      {searching ? (
        <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-slate-500">{t("action.loading")}</div>
      ) : !hasContentResults && !hasWikiResults ? (
        <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-slate-500">{t("action.noData")}</div>
      ) : (
        <>
          {hasWikiResults && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-orange-500 bg-orange-500/5">
                {t("wiki:title")}
              </div>
              {displayedWikiResults.map((wp) => (
                <button
                  key={`wiki-${wp.id}`}
                  onClick={() => {
                    switchTab("wiki");
                    setTimeout(() => {
                      useWikiStore.getState().selectPage(wp.id);
                    }, 100);
                    setSearchOpen(false);
                    resetSearchState(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-orange-500/10 dark:hover:bg-orange-500/15
                             border-b border-gray-100/50 dark:border-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={12} className="flex-shrink-0 text-orange-500" />
                    <p className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1 font-medium">
                      {wp.title}
                    </p>
                    <span className="text-[10px] text-orange-400 flex-shrink-0">{wp.page_type}</span>
                  </div>
                  {wp.summary && (
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5 ml-5">
                      {wp.summary}
                    </p>
                  )}
                </button>
              ))}
            </>
          )}
          {hasContentResults && (
            <>
              {hasWikiResults && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-slate-500 bg-gray-50/50 dark:bg-white/[0.02]">
                  {t("content:title")}
                </div>
              )}
              {displayedContentResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    switchTab("content", [item.id]);
                    setSearchOpen(false);
                    resetSearchState(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-orange-500/10 dark:hover:bg-orange-500/15
                             border-b border-gray-100/50 dark:border-white/[0.04] last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {item.content_type === "image" ? (
                      <ImageIcon size={12} className="flex-shrink-0 text-orange-500" />
                    ) : item.content_type === "url" ? (
                      <Link2 size={12} className="flex-shrink-0 text-orange-500" />
                    ) : (
                      <FileText size={12} className="flex-shrink-0 text-orange-500" />
                    )}
                    <p className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">
                      {item.raw_text?.slice(0, 80) || item.source_url || t("content:card.noContent")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 ml-5">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      {item.captured_at?.slice(0, 10)}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      {item.source_app}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
