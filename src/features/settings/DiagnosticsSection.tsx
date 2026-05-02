import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { TFunction } from "i18next";
import type { AutomationSnapshot } from "../../services/automationService";

interface DiagnosticsSectionProps {
  automationSnapshot: AutomationSnapshot | null;
  onRequestAutomation: () => void;
  onOpenSystemSettings: () => void;
  tAuto: TFunction<"automation">;
}

export function DiagnosticsSection({
  automationSnapshot,
  onRequestAutomation,
  onOpenSystemSettings,
  tAuto,
}: DiagnosticsSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {tAuto("settings.sectionTitle")}
      </h2>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        {tAuto("settings.sectionDescription")}
      </p>

      <div className="glass rounded-2xl">
        <div className="p-5 flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            {automationSnapshot?.status === "granted" && (
              <ShieldCheck className="w-8 h-8 text-green-500" />
            )}
            {automationSnapshot?.status === "denied" && (
              <ShieldAlert className="w-8 h-8 text-red-500" />
            )}
            {(automationSnapshot?.status === "dismissed" ||
              automationSnapshot?.status === "unknown" ||
              !automationSnapshot) && (
              <ShieldQuestion className="w-8 h-8 text-gray-400 dark:text-slate-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {tAuto("settings.automationLabel")}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 mb-3">
              {tAuto("settings.automationDesc")}
            </div>

            <div className="mb-3">
              {automationSnapshot?.status === "granted" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                                 bg-green-500/10 text-green-600 dark:text-green-400
                                 border border-green-500/20">
                  {tAuto("settings.statusGranted")}
                </span>
              )}
              {automationSnapshot?.status === "denied" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                                 bg-red-500/10 text-red-600 dark:text-red-400
                                 border border-red-500/20">
                  {tAuto("settings.statusDenied")}
                </span>
              )}
              {automationSnapshot?.status === "dismissed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                                 bg-gray-500/10 text-gray-500 dark:text-slate-400
                                 border border-gray-500/20">
                  {tAuto("settings.statusDismissed")}
                </span>
              )}
              {(automationSnapshot?.status === "unknown" || !automationSnapshot) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                                 bg-gray-500/10 text-gray-500 dark:text-slate-400
                                 border border-gray-500/20">
                  {tAuto("settings.statusUnknown")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {(automationSnapshot?.status === "unknown" ||
                automationSnapshot?.status === "dismissed") && (
                <button
                  onClick={onRequestAutomation}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg
                             bg-orange-500 text-white hover:bg-orange-600
                             transition-colors"
                >
                  {tAuto("settings.requestButton")}
                </button>
              )}

              {automationSnapshot?.status === "denied" && (
                <>
                  <button
                    onClick={onOpenSystemSettings}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg
                               bg-red-500 text-white hover:bg-red-600
                               transition-colors"
                  >
                    {tAuto("settings.openSettings")}
                  </button>
                  <button
                    onClick={onRequestAutomation}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg
                               border border-gray-200 dark:border-white/[0.08]
                               text-gray-600 dark:text-gray-300
                               bg-white/40 dark:bg-white/[0.04]
                               hover:bg-white/70 dark:hover:bg-white/[0.08]
                               transition-colors"
                  >
                    {tAuto("settings.reauthorizeButton")}
                  </button>
                </>
              )}

              {automationSnapshot?.status === "granted" && (
                <button
                  onClick={onOpenSystemSettings}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg
                             border border-gray-200 dark:border-white/[0.08]
                             text-gray-600 dark:text-gray-300
                             bg-white/40 dark:bg-white/[0.04]
                             hover:bg-white/70 dark:hover:bg-white/[0.08]
                             transition-colors"
                >
                  {tAuto("settings.openSettings")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
