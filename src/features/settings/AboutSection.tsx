import { CheckCircle2, ExternalLink, RefreshCcw } from "lucide-react";
import type { TFunction } from "i18next";
import type { UpdateInfo, UpdateSettings } from "../../services/updateService";
import { SettingRow, ToggleSwitch } from "./SettingsCommon";

interface AboutSectionProps {
  updateSettings: UpdateSettings | null;
  latestInfo: UpdateInfo | null;
  checkResult: "up-to-date" | "error" | null;
  checkError: string;
  checking: boolean;
  onToggleAutoCheck: (enabled: boolean) => void;
  onCheckNow: () => void;
  onOpenReleases: () => void;
  tUpdate: TFunction<"update">;
}

export function AboutSection({
  updateSettings,
  latestInfo,
  checkResult,
  checkError,
  checking,
  onToggleAutoCheck,
  onCheckNow,
  onOpenReleases,
  tUpdate,
}: AboutSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {tUpdate("settings.sectionTitle")}
      </h2>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        {tUpdate("settings.sectionDescription")}
      </p>

      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        <SettingRow label={tUpdate("settings.currentVersion")}>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
            v{updateSettings?.current_version ?? "…"}
          </span>
        </SettingRow>

        <SettingRow label={tUpdate("settings.latestVersion")}>
          {latestInfo ? (
            <span className="text-sm font-mono text-orange-600 dark:text-orange-400 font-semibold">
              v{latestInfo.version}
            </span>
          ) : checkResult === "up-to-date" ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {tUpdate("settings.upToDate")}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
          )}
        </SettingRow>

        <SettingRow
          label={tUpdate("settings.autoCheckLabel")}
          desc={tUpdate("settings.autoCheckHint")}
        >
          <ToggleSwitch
            checked={updateSettings?.check_enabled ?? true}
            onChange={onToggleAutoCheck}
          />
        </SettingRow>

        <div className="p-4 flex flex-col gap-2">
          <button
            onClick={onCheckNow}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg
                       bg-orange-500 text-white hover:bg-orange-600
                       disabled:bg-gray-300 dark:disabled:bg-white/[0.06]
                       disabled:text-gray-400 dark:disabled:text-slate-500
                       disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? tUpdate("settings.checking") : tUpdate("settings.checkNow")}
          </button>

          <button
            onClick={onOpenReleases}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg
                       border text-gray-600 dark:text-gray-300
                       border-gray-200/50 dark:border-white/[0.08]
                       bg-white/40 dark:bg-white/[0.04]
                       hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {tUpdate("settings.viewReleases")}
          </button>

          {checkResult === "error" && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 break-words">
              {tUpdate("settings.checkFailed", { error: checkError })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
