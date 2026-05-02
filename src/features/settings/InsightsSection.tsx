import type { TFunction } from "i18next";
import { SettingRow } from "./SettingsCommon";

interface InsightsSectionProps {
  radarIntervalDays: number;
  setRadarIntervalDays: (value: number) => void;
  t: TFunction<"settings">;
}

export function InsightsSection({
  radarIntervalDays,
  setRadarIntervalDays,
  t,
}: InsightsSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t("insights.title")}</h2>
      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        <SettingRow label={t("insights.interval")} desc={t("insights.intervalDesc")}>
          <select
            value={radarIntervalDays}
            onChange={(e) => setRadarIntervalDays(Number(e.target.value))}
            className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50"
          >
            <option value={1}>{t("insights.intervalDaily")}</option>
            <option value={3}>{t("insights.interval3Days")}</option>
            <option value={7}>{t("insights.intervalWeekly")}</option>
            <option value={30}>{t("insights.intervalMonthly")}</option>
          </select>
        </SettingRow>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-3 px-1">
        {t("insights.hint")}
      </p>
    </div>
  );
}
