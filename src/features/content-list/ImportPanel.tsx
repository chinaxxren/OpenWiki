import { FileText, Image as ImageIcon, Import } from "lucide-react";

interface ImportPanelProps {
  align: "center" | "right";
  isImportBusy: boolean;
  importStatus: string;
  supportedFormats: string[];
  futureFormats: string[];
  onChooseFiles: () => void;
  t: (key: string) => string;
}

export function ImportPanel({
  align,
  isImportBusy,
  importStatus,
  supportedFormats,
  futureFormats,
  onChooseFiles,
  t,
}: ImportPanelProps) {
  return (
    <div
      className={`absolute top-full mt-2 z-50 w-72 rounded-xl border border-stone-200/80 bg-white p-3 shadow-xl shadow-stone-950/10 dark:border-white/[0.08] dark:bg-stone-950 dark:shadow-black/30 ${
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
          <Import size={16} className="text-orange-500" />
          {t("import.panelTitle")}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <FileText size={13} />
            {t("import.supportedLabel")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supportedFormats.map((format) => (
              <span
                key={format}
                className="rounded-md border border-orange-500/20 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300"
              >
                {format}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-stone-400 dark:text-stone-500">
            <ImageIcon size={13} />
            {t("import.futureLabel")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {futureFormats.map((format) => (
              <span
                key={format}
                className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-stone-500"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onChooseFiles}
        disabled={isImportBusy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-500 bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-orange-600 disabled:opacity-60"
      >
        <Import size={16} />
        {importStatus === "picking" ? t("import.choosing") : isImportBusy ? t("import.importing") : t("import.chooseButton")}
      </button>
    </div>
  );
}
