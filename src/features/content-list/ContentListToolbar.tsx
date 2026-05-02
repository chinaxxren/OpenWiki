import { CheckCircle2, Download, Import, LoaderCircle, type LucideIcon } from "lucide-react";
import { ImportPanel } from "./ImportPanel";

type ContentFilter = "all" | "text" | "image" | "url" | "mixed" | "document";

interface FilterTab {
  value: ContentFilter;
  labelKey: string;
  icon: LucideIcon;
}

interface ContentListToolbarProps {
  filterTabs: FilterTab[];
  typeCounts: Record<string, number>;
  filter: ContentFilter;
  setFilter: (value: ContentFilter) => void;
  dateRange: "all" | "today" | "week" | "half-month";
  setDateRange: (value: "all" | "today" | "week" | "half-month") => void;
  importPanelRef: React.RefObject<HTMLDivElement | null>;
  openImportPanel: () => void;
  isImportBusy: boolean;
  isImportPanelOpen: boolean;
  importStatus: string;
  supportedFormats: string[];
  futureFormats: string[];
  onChooseFiles: () => void;
  exportStatus: "idle" | "confirm" | "exporting" | "done";
  onExportClick: () => Promise<void>;
  captureEnabled: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ContentListToolbar({
  filterTabs,
  typeCounts,
  filter,
  setFilter,
  dateRange,
  setDateRange,
  importPanelRef,
  openImportPanel,
  isImportBusy,
  isImportPanelOpen,
  importStatus,
  supportedFormats,
  futureFormats,
  onChooseFiles,
  exportStatus,
  onExportClick,
  captureEnabled,
  t,
}: ContentListToolbarProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-1 p-0.5 rounded-xl glass">
        {filterTabs.map((tab) => {
          const count = typeCounts[tab.value] || 0;
          if (tab.value !== "all" && count === 0) return null;
          const isActive = filter === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`
                flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all
                ${isActive
                  ? "bg-white/80 dark:bg-white/[0.1] text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(tab.labelKey)}</span>
              <span className={`
                ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]
                ${isActive
                  ? "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"
                  : "bg-gray-200/50 dark:bg-white/[0.06] text-gray-400 dark:text-slate-500"
                }
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        {(["all", "today", "week", "half-month"] as const).map((range) => {
          const labelKey = range === "all" ? "dateRange.all" : range === "today" ? "dateRange.today" : range === "week" ? "dateRange.week" : "dateRange.halfMonth";
          const label = t(labelKey);
          const isActive = dateRange === range;
          return (
            <button
              key={range}
              onClick={() => setDateRange(isActive && range !== "all" ? "all" : range)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-all
                ${isActive
                  ? "text-white bg-orange-500 border-orange-500"
                  : "text-gray-400 dark:text-slate-500 border-gray-200/60 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:border-orange-300 hover:text-orange-500"
                }`}
            >
              {label}
            </button>
          );
        })}

        <div className="w-px h-4 bg-gray-200/60 dark:bg-white/[0.08] mx-0.5" />

        <div ref={importPanelRef} className="relative">
          <button
            onClick={openImportPanel}
            disabled={isImportBusy}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 disabled:opacity-60
              ${importStatus === "done"
                ? "text-green-600 border-green-300 bg-green-50"
                : importStatus === "error"
                ? "text-red-500 border-red-200 bg-red-50 dark:bg-red-500/10"
                : isImportBusy
                ? "text-orange-500 border-orange-300 bg-orange-50 animate-pulse"
                : "text-gray-400 dark:text-slate-500 border-gray-200/60 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:border-orange-300 hover:text-orange-500"
              }`}
          >
            <Import size={13} />
            {isImportBusy ? t("import.importing") : t("import.button")}
          </button>
          {isImportPanelOpen ? (
            <ImportPanel
              align="right"
              isImportBusy={isImportBusy}
              importStatus={importStatus}
              supportedFormats={supportedFormats}
              futureFormats={futureFormats}
              onChooseFiles={onChooseFiles}
              t={t}
            />
          ) : null}
        </div>

        <button
          onClick={() => { void onExportClick(); }}
          disabled={exportStatus === "exporting"}
          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1
            ${exportStatus === "confirm"
              ? "text-orange-600 border-orange-400 bg-orange-100 dark:bg-orange-500/20"
              : exportStatus === "done"
              ? "text-green-600 border-green-300 bg-green-50"
              : exportStatus === "exporting"
              ? "text-orange-500 border-orange-300 bg-orange-50 animate-pulse"
              : "text-gray-400 dark:text-slate-500 border-gray-200/60 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] hover:border-orange-300 hover:text-orange-500"
            }`}
        >
          {exportStatus === "confirm" ? (
            t("export.confirm")
          ) : exportStatus === "exporting" ? (
            <>
              <LoaderCircle size={12} className="animate-spin" />
              {t("export.exporting")}
            </>
          ) : exportStatus === "done" ? (
            <>
              <CheckCircle2 size={12} />
              {t("export.done")}
            </>
          ) : (
            <>
              <Download size={12} />
              {t("export.button")}
            </>
          )}
        </button>

        <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 ml-1">
          <span className={`w-1.5 h-1.5 rounded-full ${captureEnabled ? "bg-green-400" : "bg-gray-300 dark:bg-slate-600"}`} />
          {captureEnabled ? t("capture.active") : t("capture.paused")}
        </div>
      </div>
    </div>
  );
}
