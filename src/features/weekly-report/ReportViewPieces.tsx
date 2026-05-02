import { motion } from "framer-motion";
import type { ReportSummary } from "../../types/report";

export function ReportErrorBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {message}
      <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

export function ReportEmptyState({
  title,
  description,
  buttonLabel,
  onGenerate,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onGenerate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl glass shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-300 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">{title}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">{description}</p>
      <button
        onClick={onGenerate}
        className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium
                   hover:opacity-80 transition-opacity cursor-pointer shadow-sm"
      >
        {buttonLabel}
      </button>
    </motion.div>
  );
}

export function ReportGeneratingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-2xl glass shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center">
          <motion.svg
            className="w-6 h-6 text-gray-400 dark:text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </motion.svg>
        </div>
        <motion.div
          className="absolute -inset-2 rounded-2xl border-2 "
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500">{description}</p>
    </motion.div>
  );
}

export function HistoryDropdown({
  reports,
  currentWeekStart,
  onSelect,
  onClose,
}: {
  reports: ReportSummary[];
  currentWeekStart: string | null;
  onSelect: (weekStart: string) => void;
  onClose: () => void;
}) {
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-full mt-1 w-52 glass-heavy rounded-2xl shadow-lg
                    overflow-hidden z-40"
      >
        <div className="max-h-52 overflow-y-auto">
          {reports.map((r) => {
            const active = r.week_start === currentWeekStart;
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.week_start)}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors cursor-pointer
                  ${active ? "bg-white/40 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50"}
                `}
              >
                <span>{fmtDate(r.week_start)} - {fmtDate(r.week_end)}</span>
                <span className="text-gray-300 dark:text-slate-600 ml-auto">{r.content_count}</span>
                {active && <div className="w-1 h-1 rounded-full bg-gray-900 dark:bg-white" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
