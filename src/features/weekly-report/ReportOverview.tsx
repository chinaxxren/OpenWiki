import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ReportSummaryCard } from "./ReportSummary";
import { SECTION_THEME } from "./reportThemes";
import { ImageFilmstrip } from "./ImageFilmstrip";
import { CompactLinkList } from "./CompactLinkList";
import { TextContentList } from "./TextContentList";
import { filterWeekContentsByMode, mapSelectedSectionContentItems, rankSectionsByRelevance, selectSectionById, type ReportFilterMode } from "./reportViewLogic";
import { SectionDetailPanel } from "./SectionDetailPanel";
import type { ReportSection, WeeklyReport } from "../../types/report";
import type { CapturedContent } from "../../types/content";

const DEFAULT_THEME = SECTION_THEME.routine;

export function ReportOverview({
  report,
  filterMode,
  onFilterChange,
  weekContents,
}: {
  report: WeeklyReport;
  filterMode: ReportFilterMode;
  onFilterChange: (f: ReportFilterMode) => void;
  weekContents: CapturedContent[];
}) {
  const { t } = useTranslation("report");
  const rankedSections = useMemo(
    () => rankSectionsByRelevance(report.sections),
    [report.sections]
  );
  const filteredContents = useMemo(
    () => filterWeekContentsByMode(weekContents, filterMode),
    [weekContents, filterMode]
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const selectedSection = useMemo(
    () => selectSectionById(rankedSections, selectedSectionId),
    [rankedSections, selectedSectionId]
  );
  const selectedContentItems = useMemo(
    () => mapSelectedSectionContentItems(selectedSection, weekContents),
    [selectedSection, weekContents]
  );

  return (
    <motion.div
      key={report.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <ReportSummaryCard
        report={report}
        activeFilter={filterMode}
        onFilterChange={onFilterChange}
      />

      <AnimatePresence mode="wait">
        {filterMode === "all" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <StatsCard report={report} />
              <RankingCard
                sections={report.sections}
                onSelectSection={(id) => setSelectedSectionId(id)}
              />
            </div>

            {report.summary_text && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="text-[13px] font-medium leading-relaxed text-gray-500 dark:text-slate-400 mb-2.5"
              >
                {report.summary_text}
              </motion.p>
            )}

            <div className="space-y-1">
              {rankedSections.map((section, i) => (
                <SectionListItem
                  key={section.id}
                  section={section}
                  index={i}
                  isSelected={section.id === selectedSectionId}
                  onClick={() => setSelectedSectionId(
                    section.id === selectedSectionId ? null : section.id
                  )}
                />
              ))}
            </div>
          </motion.div>
        ) : filterMode === "image" ? (
          <motion.div
            key="image-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <ImageFilmstrip items={filteredContents} />
          </motion.div>
        ) : filterMode === "url" ? (
          <motion.div
            key="url-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <CompactLinkList items={filteredContents} />
          </motion.div>
        ) : (
          <motion.div
            key="text-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TextContentList items={filteredContents} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[10px] text-gray-300 dark:text-slate-600 py-2">
        {t("footer.itemsCount", { count: report.content_count })} · {t("footer.analysisCount", { count: report.sections.length })}
      </p>

      {createPortal(
        <AnimatePresence>
          {selectedSection && (
            <SectionDetailPanel
              section={selectedSection}
              contentItems={selectedContentItems}
              onClose={() => setSelectedSectionId(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

function SectionListItem({
  section,
  index,
  isSelected,
  onClick,
}: {
  section: ReportSection;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const theme = SECTION_THEME[section.section_type] || DEFAULT_THEME;
  const score = section.relevance_score ?? 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer
        ${isSelected
          ? "glass shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
          : "hover:bg-white/60 dark:hover:bg-slate-800/40"
        }
      `}
    >
      <div className={`w-6 h-6 rounded-lg ${theme.accent} flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-3 h-3 ${theme.accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={theme.iconPath} />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium leading-snug truncate ${
          isSelected
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-700 dark:text-gray-300"
        }`}>
          {section.title}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
          {section.body.slice(0, 60)}
          {section.body.length > 60 ? "..." : ""}
        </p>
      </div>

      {score > 0 && (
        <div className="flex-shrink-0 w-8 h-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              score >= 0.8 ? "bg-red-400 dark:bg-red-500" :
              score >= 0.5 ? "bg-blue-400 dark:bg-blue-500" :
              "bg-gray-300 dark:bg-slate-500"
            }`}
            style={{ width: `${Math.round(score * 100)}%` }}
          />
        </div>
      )}

      <svg
        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
          isSelected ? "rotate-90 text-gray-500 dark:text-slate-400" : "text-gray-300 dark:text-slate-600"
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </motion.button>
  );
}

function StatsCard({ report }: { report: WeeklyReport }) {
  const { t } = useTranslation("report");
  const stats = report.report_json?.stats;
  if (!stats) return <div className="rounded-2xl glass p-4" />;

  const maxCount = Math.max(...stats.daily_counts, 1);
  const typeCounts = stats.type_counts ?? { text: 0, url: 0, image: 0 };
  const dayLabels = t("dayLabels", { returnObjects: true }) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl glass
                 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]
                 dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]
                 p-3.5 flex flex-col justify-between"
    >
      <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        {t("stats.thisWeekData")}
      </p>

      <div className="mt-1.5">
        <span className="text-[28px] font-black text-gray-900 dark:text-gray-50 leading-none tracking-tight">
          {stats.total_items}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-1">{t("stats.itemsCount")}</span>
      </div>

      <div className="flex items-end gap-[3px] mt-3 h-[28px]">
        {stats.daily_counts.map((count, i) => {
          const h = count === 0 ? 2 : Math.max(4, Math.round((count / maxCount) * 28));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-sm ${
                  count === 0
                    ? "bg-gray-100 dark:bg-slate-700"
                    : "bg-gray-800 dark:bg-slate-300"
                }`}
                style={{ height: `${h}px` }}
              />
              <span className="text-[8px] text-gray-300 dark:text-slate-600 leading-none">{dayLabels[i]}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mt-2.5">
        {typeCounts.text > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400">
            {typeCounts.text} {t("contentType.text")}
          </span>
        )}
        {typeCounts.url > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400">
            {typeCounts.url} {t("contentType.url")}
          </span>
        )}
        {typeCounts.image > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400">
            {typeCounts.image} {t("contentType.image")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

const RANK_COLORS = [
  { bg: "bg-amber-400", text: "text-white", label: "1" },
  { bg: "bg-gray-300 dark:bg-slate-500", text: "text-white", label: "2" },
  { bg: "bg-amber-700/60", text: "text-white", label: "3" },
];

function RankingCard({ sections, onSelectSection }: {
  sections: ReportSection[];
  onSelectSection: (sectionId: string) => void;
}) {
  const { t } = useTranslation("report");
  const topSections = useMemo(() => {
    return [...sections]
      .filter((s) => s.section_type !== "recommendation" && s.section_type !== "routine")
      .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
      .slice(0, 3);
  }, [sections]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
      className="rounded-2xl glass
                 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]
                 dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]
                 p-3.5 flex flex-col"
    >
      <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
        {t("stats.importantContent")}
      </p>

      <div className="flex flex-col gap-2 mt-2.5 flex-1">
        {topSections.map((section, i) => {
          const rank = RANK_COLORS[i] || RANK_COLORS[2];
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className="flex items-start gap-2 text-left group cursor-pointer"
            >
              <div className={`w-4 h-4 rounded ${rank.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <span className={`text-[9px] font-bold ${rank.text} leading-none`}>{rank.label}</span>
              </div>
              <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200 leading-snug line-clamp-2
                            group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {section.title}
              </p>
            </button>
          );
        })}

        {topSections.length === 0 && (
          <p className="text-[11px] text-gray-300 dark:text-slate-600 italic mt-2">{t("noData")}</p>
        )}
      </div>
    </motion.div>
  );
}
