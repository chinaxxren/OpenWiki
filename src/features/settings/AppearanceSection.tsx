import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import type { LanguageMode, ThemeMode } from "../../stores/settingsStore";

interface ThemeOption {
  value: ThemeMode;
  key: string;
  icon: LucideIcon;
}

interface LanguageOption {
  value: LanguageMode;
  key: string;
}

interface AppearanceSectionProps {
  theme: ThemeMode;
  languageMode: LanguageMode;
  setTheme: (value: ThemeMode) => void;
  setLanguageMode: (value: LanguageMode) => void;
  themeOptions: ThemeOption[];
  languageOptions: LanguageOption[];
  t: TFunction<"settings">;
}

export function AppearanceSection({
  theme,
  languageMode,
  setTheme,
  setLanguageMode,
  themeOptions,
  languageOptions,
  t,
}: AppearanceSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t("sections.appearance")}</h2>
      <div className="glass rounded-2xl">
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("theme.label")}
          </label>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all duration-150
                  ${theme === opt.value
                    ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 shadow-sm"
                    : "bg-white/50 dark:bg-white/[0.04] border-white/60 dark:border-white/[0.08] text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/[0.08]"
                  }
                `}
              >
                <opt.icon className="w-4 h-4" />
                <span>{t(opt.key)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100/50 dark:border-white/[0.06]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("language.label")}
          </label>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t("language.description")}</p>
          <div className="flex gap-2">
            {languageOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLanguageMode(opt.value)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all duration-150
                  ${languageMode === opt.value
                    ? "bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 shadow-sm"
                    : "bg-white/50 dark:bg-white/[0.04] border-white/60 dark:border-white/[0.08] text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/[0.08]"
                  }
                `}
              >
                <span>{t(opt.key)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
