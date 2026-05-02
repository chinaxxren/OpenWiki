import type { TFunction } from "i18next";
import { ExportSection } from "./ExportSection";
import { SettingRow } from "./SettingsCommon";
import { WikiSettingsSection } from "./WikiSettingsSection";

interface StorageSectionProps {
  totalItems: number;
  diskUsageMB: number;
  screenshotDir: string;
  onOpenDataFolder: () => void;
  t: TFunction<"settings">;
}

export function StorageSection({
  totalItems,
  diskUsageMB,
  screenshotDir,
  onOpenDataFolder,
  t,
}: StorageSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t("storage.title")}</h2>
      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        <SettingRow label={t("storage.totalItems")}>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{totalItems} {t("storage.totalItemsUnit")}</span>
        </SettingRow>
        <SettingRow label={t("storage.diskUsage")}>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{diskUsageMB.toFixed(1)} {t("storage.unit")}</span>
        </SettingRow>
        <SettingRow label={t("storage.screenshotDir")}>
          <span className="text-xs font-mono text-gray-500 dark:text-slate-400 break-all">{screenshotDir}</span>
        </SettingRow>
        <div className="p-4">
          <button
            onClick={onOpenDataFolder}
            className="w-full py-2 text-sm font-medium rounded-lg border text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.04] hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors"
          >
            {t("storage.openDataFolder")}
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 mt-6">{t("export.title")}</h2>
      <ExportSection totalItems={totalItems} />
      <WikiSettingsSection />
    </div>
  );
}
