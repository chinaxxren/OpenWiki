import { AnimatePresence } from "framer-motion";
import { HistoryDropdown } from "./ReportViewPieces";
import type { ReportSummary } from "../../types/report";

interface ReportViewHeaderProps {
  title: string;
  weekRange: string;
  historyLabel: string;
  reportList: ReportSummary[];
  currentWeekStart: string | null;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  onSelectHistory: (weekStart: string) => void;
  onCloseHistory: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generatingLabel: string;
  generateLabel: string;
}

function LoadingSpinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function ReportViewHeader({
  title,
  weekRange,
  historyLabel,
  reportList,
  currentWeekStart,
  isHistoryOpen,
  onToggleHistory,
  onSelectHistory,
  onCloseHistory,
  onGenerate,
  isGenerating,
  generatingLabel,
  generateLabel,
}: ReportViewHeaderProps) {
  return (
    <div className="sticky top-0 z-20 glass-heavy">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              {weekRange}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {reportList.length > 0 && (
              <div className="relative">
                <button
                  onClick={onToggleHistory}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-400 dark:text-slate-500
                             hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {historyLabel}
                </button>
                <AnimatePresence>
                  {isHistoryOpen && (
                    <HistoryDropdown
                      reports={reportList}
                      currentWeekStart={currentWeekStart}
                      onSelect={onSelectHistory}
                      onClose={onCloseHistory}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer
                ${isGenerating
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-400 cursor-not-allowed"
                  : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80 shadow-sm"
                }
              `}
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  {generatingLabel}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {generateLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
