import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useReportStore } from "../../stores/reportStore";
import { useResolvedContents } from "../../stores/contentEntitiesStore";
import {
  ReportEmptyState,
  ReportErrorBanner,
  ReportGeneratingState,
} from "./ReportViewPieces";
import { ReportViewHeader } from "./ReportViewHeader";
import { ReportOverview } from "./ReportOverview";
import {
  formatCurrentWeekRange,
  formatReportDateRange,
} from "./reportViewLogic";
import type { FilterMode } from "./ActivityStatsCard";

export function ReportView() {
  const { t } = useTranslation("report");
  const {
    currentReport,
    reportList,
    weekContentIds,
    isGenerating,
    error,
    bootstrap,
    loadReportByWeekStart,
    generateCurrentReport,
    clearWeekContent,
    setError,
  } = useReportStore();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const reportListLoadedRef = useRef(false);

  const loadReport = useCallback(async (weekStart: string) => {
    try {
      await loadReportByWeekStart(weekStart);
      setFilterMode("all");
      setIsHistoryOpen(false);
    } catch {
      // Store already recorded the error state.
    }
  }, [loadReportByWeekStart]);

  useEffect(() => {
    if (reportListLoadedRef.current) return;
    reportListLoadedRef.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!currentReport && weekContentIds.length > 0) {
      clearWeekContent();
    }
  }, [clearWeekContent, currentReport, weekContentIds.length]);

  const weekContents = useResolvedContents(weekContentIds);

  const handleGenerate = useCallback(async () => {
    try {
      await generateCurrentReport();
      setFilterMode("all");
    } catch {
      // Store already recorded the error state.
    }
  }, [generateCurrentReport]);

  const weekRange = currentReport
    ? formatReportDateRange(currentReport.week_start, currentReport.week_end)
    : formatCurrentWeekRange();

  return (
    <div className="min-h-screen">
      <ReportViewHeader
        title={t("title")}
        weekRange={weekRange}
        historyLabel={t("history")}
        reportList={reportList}
        currentWeekStart={currentReport?.week_start ?? null}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onSelectHistory={loadReport}
        onCloseHistory={() => setIsHistoryOpen(false)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        generatingLabel={t("generating")}
        generateLabel={t("generate")}
      />

      <div className="px-3 pb-4">
        <AnimatePresence>
          {error && (
            <ReportErrorBanner
              message={t(`error.${error}`)}
              onClose={() => setError(null)}
            />
          )}
        </AnimatePresence>

        {isGenerating && !currentReport && (
          <ReportGeneratingState
            title={t("generatingState.title")}
            description={t("generatingState.desc")}
          />
        )}
        {!isGenerating && !currentReport && (
          <ReportEmptyState
            title={t("empty.title")}
            description={t("empty.desc")}
            buttonLabel={t("empty.generate")}
            onGenerate={handleGenerate}
          />
        )}
        {currentReport && (
          <ReportOverview
            report={currentReport}
            filterMode={filterMode}
            onFilterChange={setFilterMode}
            weekContents={weekContents}
          />
        )}
      </div>
    </div>
  );
}
