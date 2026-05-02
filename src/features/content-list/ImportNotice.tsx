import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

interface ImportNoticeProps {
  importStatus: string;
  importMessage: string;
  isImportTakingLong: boolean;
  isImportBusy: boolean;
  t: (key: string) => string;
}

export function ImportNotice({
  importStatus,
  importMessage,
  isImportTakingLong,
  isImportBusy,
  t,
}: ImportNoticeProps) {
  if (importStatus === "idle" || importStatus === "picking" || !importMessage) return null;

  const isError = importStatus === "error";
  const isDone = importStatus === "done";
  const statusColor = isError
    ? "text-red-500"
    : isDone
    ? "text-green-600 dark:text-green-400"
    : "text-orange-500";
  const borderColor = isError
    ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
    : isDone
    ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
    : "border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10";

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-[min(360px,calc(100vw-48px))]">
      <div className={`rounded-xl border px-4 py-3 shadow-xl shadow-stone-950/10 dark:shadow-black/30 ${borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${statusColor}`}>
            {isError ? (
              <XCircle size={18} />
            ) : isDone ? (
              <CheckCircle2 size={18} />
            ) : (
              <LoaderCircle size={18} className="animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${statusColor}`}>
              {isError ? t("import.noticeError") : isDone ? t("import.noticeDone") : t("import.noticeWorking")}
            </div>
            <div className="mt-0.5 break-words text-xs leading-5 text-stone-600 dark:text-stone-300">
              {importMessage}
            </div>
            {isImportTakingLong && isImportBusy && (
              <div className="mt-1 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
                {t("import.takingLong")}
              </div>
            )}
            {isImportBusy && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/80 dark:bg-white/[0.08]">
                <div className="h-full w-1/2 rounded-full bg-orange-500/80 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
