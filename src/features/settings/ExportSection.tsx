import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

export function ExportSection({ totalItems }: { totalItems: number }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "done">("idle");
  const [resultMsg, setResultMsg] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [copyPathStatus, setCopyPathStatus] = useState<"idle" | "copying" | "done">("idle");
  const [copiedPath, setCopiedPath] = useState("");

  const handleExportAll = async () => {
    setExportStatus("exporting");
    try {
      await invoke("export_all_single");
      setResultMsg(t("export.exportedAll", { count: totalItems }));
      setExportStatus("done");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
      setExportStatus("idle");
    }
  };

  const handleCopyPath = async () => {
    setCopyPathStatus("copying");
    try {
      const path = await invoke<string>("export_all_single_quiet");
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setCopyPathStatus("done");
      setTimeout(() => setCopyPathStatus("idle"), 4000);
    } catch (e) {
      console.error(e);
      setCopyPathStatus("idle");
    }
  };

  const handleExportRange = async () => {
    if (!startDate || !endDate) return;
    setExportStatus("exporting");
    try {
      await invoke("export_range_single", { start: startDate, end: endDate });
      setResultMsg(t("export.exportedRange", { start: startDate, end: endDate }));
      setExportStatus("done");
      setRangeOpen(false);
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
      setExportStatus("idle");
    }
  };

  return (
    <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
      <div className="p-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("export.exportAll")}</div>
        <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          {t("export.exportAllDesc", { count: totalItems })}
        </div>
        <button
          onClick={handleExportAll}
          disabled={exportStatus === "exporting"}
          className="w-full py-2 text-sm font-medium rounded-lg border
                     text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20
                     bg-orange-50/50 dark:bg-orange-500/[0.06]
                     hover:bg-orange-100/50 dark:hover:bg-orange-500/[0.12]
                     disabled:opacity-50 transition-colors"
        >
          {exportStatus === "exporting" ? t("export.exporting") : t("export.exportAllBtn")}
        </button>
      </div>

      <div className="p-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("export.copyPath")}</div>
        <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          {t("export.copyPathDesc")}
        </div>
        <button
          onClick={handleCopyPath}
          disabled={copyPathStatus === "copying"}
          className="w-full py-2 text-sm font-medium rounded-lg border
                     text-gray-700 dark:text-gray-200 border-gray-200/60 dark:border-white/[0.10]
                     bg-white/40 dark:bg-white/[0.04]
                     hover:bg-white/70 dark:hover:bg-white/[0.08]
                     disabled:opacity-50 transition-colors"
        >
          {copyPathStatus === "copying"
            ? t("export.copyingPath")
            : copyPathStatus === "done"
            ? `✓ ${t("export.pathCopied")}`
            : t("export.copyPathBtn")}
        </button>
        {copyPathStatus === "done" && copiedPath && (
          <div className="mt-2 px-2.5 py-1.5 rounded-md text-[11px] font-mono break-all
                          text-gray-500 dark:text-slate-400
                          bg-gray-50/70 dark:bg-white/[0.03]
                          border border-gray-100/60 dark:border-white/[0.05]">
            {copiedPath}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("export.exportRange")}</div>
        <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          {t("export.exportRangeDesc")}
        </div>
        {!rangeOpen ? (
          <button
            onClick={() => {
              setRangeOpen(true);
              if (!startDate) {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 7);
                setStartDate(start.toISOString().slice(0, 10));
                setEndDate(end.toISOString().slice(0, 10));
              }
            }}
            className="w-full py-2 text-sm font-medium rounded-lg border
                       text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-white/[0.08]
                       bg-white/40 dark:bg-white/[0.04]
                       hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors"
          >
            {t("export.selectDateRange")}
          </button>
        ) : (
          <div className="space-y-2.5">
            <div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("export.startDate")}</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-white/[0.08]
                           bg-white/50 dark:bg-white/[0.04] text-gray-800 dark:text-gray-200
                           focus:outline-none focus:ring-1 focus:ring-orange-400/50"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("export.endDate")}</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-white/[0.08]
                           bg-white/50 dark:bg-white/[0.04] text-gray-800 dark:text-gray-200
                           focus:outline-none focus:ring-1 focus:ring-orange-400/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRangeOpen(false)}
                className="flex-1 py-1.5 text-sm font-medium rounded-lg border
                           text-gray-500 dark:text-slate-400 border-gray-200/50 dark:border-white/[0.08]
                           bg-white/40 dark:bg-white/[0.04] hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors"
              >
                {tc("action.cancel")}
              </button>
              <button
                onClick={handleExportRange}
                disabled={!startDate || !endDate || exportStatus === "exporting"}
                className="flex-1 py-1.5 text-sm font-medium rounded-lg border
                           text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20
                           bg-orange-50/50 dark:bg-orange-500/[0.06]
                           hover:bg-orange-100/50 dark:hover:bg-orange-500/[0.12]
                           disabled:opacity-50 transition-colors"
              >
                {exportStatus === "exporting" ? t("export.exporting") : t("export.confirmExport")}
              </button>
            </div>
          </div>
        )}
      </div>

      {exportStatus === "done" && (
        <div className="p-4">
          <div className="px-3 py-2 rounded-lg bg-green-500/10 dark:bg-green-500/15 border border-green-300/40 dark:border-green-500/20">
            <p className="text-xs text-green-700 dark:text-green-400 text-center">
              {resultMsg}{t("export.exportedFinderHint")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
