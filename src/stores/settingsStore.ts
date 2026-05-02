import { create } from "zustand";
import { getSettings, updateSetting } from "../services/settingsService";
import { setAppLanguage, getSystemLanguage, initLanguageFromSettings } from "../i18n";

export type CaptureMode = "auto" | "confirm";
export type BubbleStyle = "circle" | "bar";
export type BubblePosition = "bottom-right" | "bottom-center" | "bottom-left" | "top-right" | "top-center" | "top-left";
export type DefaultAction = "save" | "dismiss";
export type ThemeMode = "light" | "dark" | "system";
export type LanguageMode = "system" | "zh-CN" | "en-US";

const VALID_BUBBLE_POSITIONS: BubblePosition[] = [
  "bottom-right", "bottom-center", "bottom-left",
  "top-right", "top-center", "top-left",
];

// Track the current system theme listener so we can clean it up when theme changes
let systemThemeCleanup: (() => void) | null = null;

function applyTheme(theme: ThemeMode) {
  // Clean up previous system theme listener
  if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark =
    theme === "dark" ||
    (theme === "system" && mediaQuery.matches);
  document.documentElement.classList.toggle("dark", isDark);

  // If "system" mode, listen for OS theme changes and auto-update
  if (theme === "system") {
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mediaQuery.addEventListener("change", handler);
    systemThemeCleanup = () => mediaQuery.removeEventListener("change", handler);
  }
}

interface SettingsState {
  theme: ThemeMode;
  languageMode: LanguageMode;
  resolvedLanguage: string;
  captureEnabled: boolean;
  captureMode: CaptureMode;
  bubbleStyle: BubbleStyle;
  bubblePosition: BubblePosition;
  defaultAction: DefaultAction;
  sensitiveFilterEnabled: boolean;
  urlReadingEnabled: boolean;
  radarIntervalDays: number;
  countdownDuration: number;
  screenshotDir: string;
  isLoaded: boolean;

  loadFromDB: () => Promise<void>;
  setTheme: (theme: ThemeMode) => void;
  setLanguageMode: (mode: LanguageMode) => void;
  setCaptureEnabled: (enabled: boolean) => void;
  setCaptureMode: (mode: CaptureMode) => void;
  setBubbleStyle: (style: BubbleStyle) => void;
  setBubblePosition: (position: BubblePosition) => void;
  setDefaultAction: (action: DefaultAction) => void;
  setSensitiveFilterEnabled: (enabled: boolean) => void;
  setUrlReadingEnabled: (enabled: boolean) => void;
  setRadarIntervalDays: (days: number) => void;
  setCountdownDuration: (seconds: number) => void;
  setScreenshotDir: (dir: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "system",
  languageMode: "system" as LanguageMode,
  resolvedLanguage: getSystemLanguage(),
  captureEnabled: true,
  captureMode: "confirm" as CaptureMode,
  bubbleStyle: "circle" as BubbleStyle,
  bubblePosition: "bottom-right" as BubblePosition,
  defaultAction: "dismiss" as DefaultAction,
  sensitiveFilterEnabled: false,
  urlReadingEnabled: true,
  radarIntervalDays: 3,
  countdownDuration: 5,
  screenshotDir: "~/Library/Application Support/com.openwiki.app/screenshots",
  isLoaded: false,

  loadFromDB: async () => {
    try {
      const settings = await getSettings();

      const theme = (["light", "dark", "system"].includes(settings.theme)
        ? settings.theme
        : "system") as ThemeMode;

      applyTheme(theme);

      const languageMode = (["system", "zh-CN", "en-US"].includes(settings.language_mode)
        ? settings.language_mode
        : "system") as LanguageMode;
      const resolvedLanguage = languageMode === "system" ? getSystemLanguage() : languageMode;
      await initLanguageFromSettings(languageMode);

      set({
        theme,
        languageMode,
        resolvedLanguage,
        captureEnabled: settings.capture_enabled !== "false",
        captureMode: (settings.capture_mode === "auto" ? "auto" : "confirm") as CaptureMode,
        bubbleStyle: (settings.bubble_style === "bar" ? "bar" : "circle") as BubbleStyle,
        bubblePosition: (VALID_BUBBLE_POSITIONS.includes(settings.bubble_position as BubblePosition)
          ? settings.bubble_position
          : "bottom-right") as BubblePosition,
        defaultAction: (settings.default_action === "save" ? "save" : "dismiss") as DefaultAction,
        sensitiveFilterEnabled: settings.sensitive_filter_enabled === "true",
        urlReadingEnabled: settings.url_reading_enabled !== "false",
        radarIntervalDays: parseInt(settings.radar_interval_days || "3", 10),
        countdownDuration: parseInt(settings.countdown_seconds || "5", 10),
        screenshotDir:
          settings.screenshot_dir ||
          "~/Library/Application Support/com.openwiki.app/screenshots",
        isLoaded: true,
      });
    } catch (e) {
      console.error("Failed to load settings from DB:", e);
      applyTheme("system");
      set({ isLoaded: true });
    }
  },

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    updateSetting("theme", theme).catch((e) =>
      console.error("Failed to save theme:", e)
    );
  },

  setLanguageMode: (mode) => {
    const resolved = mode === "system" ? getSystemLanguage() : mode;
    set({ languageMode: mode, resolvedLanguage: resolved });
    void setAppLanguage(mode).catch((e) =>
      console.error("Failed to apply app language:", e)
    );
    updateSetting("language_mode", mode).catch((e) =>
      console.error("Failed to save language_mode:", e)
    );
  },

  setCaptureEnabled: (enabled) => {
    set({ captureEnabled: enabled });
    updateSetting("capture_enabled", String(enabled)).catch((e) =>
      console.error("Failed to save capture_enabled:", e)
    );
  },

  setCaptureMode: (mode) => {
    set({ captureMode: mode });
    updateSetting("capture_mode", mode).catch((e) =>
      console.error("Failed to save capture_mode:", e)
    );
  },

  setBubbleStyle: (style) => {
    set({ bubbleStyle: style });
    updateSetting("bubble_style", style).catch((e) =>
      console.error("Failed to save bubble_style:", e)
    );
  },

  setBubblePosition: (position) => {
    set({ bubblePosition: position });
    updateSetting("bubble_position", position).catch((e) =>
      console.error("Failed to save bubble_position:", e)
    );
  },

  setDefaultAction: (action) => {
    set({ defaultAction: action });
    updateSetting("default_action", action).catch((e) =>
      console.error("Failed to save default_action:", e)
    );
  },

  setSensitiveFilterEnabled: (enabled) => {
    set({ sensitiveFilterEnabled: enabled });
    updateSetting("sensitive_filter_enabled", String(enabled)).catch((e) =>
      console.error("Failed to save sensitive_filter_enabled:", e)
    );
  },


  setUrlReadingEnabled: (enabled) => {
    set({ urlReadingEnabled: enabled });
    updateSetting("url_reading_enabled", String(enabled)).catch((e) =>
      console.error("Failed to save url_reading_enabled:", e)
    );
  },

  setRadarIntervalDays: (days) => {
    set({ radarIntervalDays: days });
    updateSetting("radar_interval_days", String(days)).catch((e) =>
      console.error("Failed to save radar_interval_days:", e)
    );
  },

  setCountdownDuration: (seconds) => {
    set({ countdownDuration: seconds });
    updateSetting("countdown_seconds", String(seconds)).catch((e) =>
      console.error("Failed to save countdown_seconds:", e)
    );
  },

  setScreenshotDir: (dir) => set({ screenshotDir: dir }),
}));
