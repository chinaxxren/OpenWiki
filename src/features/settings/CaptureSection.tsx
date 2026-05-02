import type { TFunction } from "i18next";
import type { BubblePosition } from "../../stores/settingsStore";
import { SettingRow, ToggleSwitch } from "./SettingsCommon";

interface BubblePositionOption {
  value: BubblePosition;
  key: string;
}

interface CaptureSectionProps {
  captureEnabled: boolean;
  captureMode: "confirm" | "auto";
  bubbleStyle: "circle" | "bar";
  bubblePosition: BubblePosition;
  countdownDuration: number;
  sensitiveFilterEnabled: boolean;
  urlReadingEnabled: boolean;
  defaultAction: "dismiss" | "save";
  setCaptureEnabled: (value: boolean) => void;
  setCaptureMode: (value: "confirm" | "auto") => void;
  setBubbleStyle: (value: "circle" | "bar") => void;
  setBubblePosition: (value: BubblePosition) => void;
  setCountdownDuration: (value: number) => void;
  setSensitiveFilterEnabled: (value: boolean) => void;
  setDefaultAction: (value: "dismiss" | "save") => void;
  setUrlReadingEnabled: (value: boolean) => void;
  bubblePositionKeys: BubblePositionOption[];
  t: TFunction<"settings">;
}

export function CaptureSection({
  captureEnabled,
  captureMode,
  bubbleStyle,
  bubblePosition,
  countdownDuration,
  sensitiveFilterEnabled,
  urlReadingEnabled,
  defaultAction,
  setCaptureEnabled,
  setCaptureMode,
  setBubbleStyle,
  setBubblePosition,
  setCountdownDuration,
  setSensitiveFilterEnabled,
  setDefaultAction,
  setUrlReadingEnabled,
  bubblePositionKeys,
  t,
}: CaptureSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t("sections.capture")}</h2>
      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        <SettingRow label={t("capture.enabled")} desc={t("capture.enabledDesc")}>
          <ToggleSwitch checked={captureEnabled} onChange={setCaptureEnabled} color="orange" />
        </SettingRow>

        <SettingRow label={t("capture.mode")} desc={t("capture.modeDesc")}>
          <div className="flex gap-1.5">
            {([
              { value: "confirm", key: "capture.confirm" },
              { value: "auto", key: "capture.auto" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCaptureMode(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                  ${captureMode === opt.value
                    ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400"
                    : "bg-white/50 dark:bg-white/[0.04] border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-slate-300"
                  }`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </SettingRow>

        {captureMode === "confirm" && (
          <SettingRow label={t("capture.defaultAction")} desc={t("capture.defaultActionDesc")}>
            <div className="flex gap-1.5">
              {([
                { value: "dismiss", key: "capture.defaultDismiss" },
                { value: "save", key: "capture.defaultSave" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDefaultAction(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                    ${defaultAction === opt.value
                      ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400"
                      : "bg-white/50 dark:bg-white/[0.04] border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-slate-300"
                    }`}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          </SettingRow>
        )}

        {captureMode === "confirm" && (
          <SettingRow label={t("capture.bubbleStyle")}>
            <div className="flex gap-1.5">
              {([
                { value: "circle", key: "capture.circle" },
                { value: "bar", key: "capture.bar" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBubbleStyle(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                    ${bubbleStyle === opt.value
                      ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400"
                      : "bg-white/50 dark:bg-white/[0.04] border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-slate-300"
                    }`}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          </SettingRow>
        )}

        {captureMode === "confirm" && (
          <SettingRow label={t("capture.bubblePosition")}>
            <select
              value={bubblePosition}
              onChange={(e) => setBubblePosition(e.target.value as BubblePosition)}
              className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50"
            >
              {bubblePositionKeys.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
              ))}
            </select>
          </SettingRow>
        )}

        {captureMode === "confirm" && (
          <SettingRow label={t("capture.countdown")} desc={t("capture.countdownDesc")}>
            <select
              value={countdownDuration}
              onChange={(e) => setCountdownDuration(Number(e.target.value))}
              className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50"
            >
              {[3, 5, 8, 10, 15].map((s) => (
                <option key={s} value={s}>{s} {t("capture.countdownUnit")}</option>
              ))}
            </select>
          </SettingRow>
        )}

        <SettingRow label={t("capture.sensitiveFilter")} desc={t("capture.sensitiveFilterDesc")}>
          <ToggleSwitch checked={sensitiveFilterEnabled} onChange={setSensitiveFilterEnabled} color="amber" />
        </SettingRow>

        <SettingRow label={t("capture.urlReading")} desc={t("capture.urlReadingDesc")}>
          <ToggleSwitch checked={urlReadingEnabled} onChange={setUrlReadingEnabled} color="green" />
        </SettingRow>
      </div>
    </div>
  );
}
