import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  Palette,
  Bot,
  Camera,
  Link as LinkIcon,
  HardDrive,
  Target,
  Info,
  Stethoscope,
  Sun,
  Moon,
  Laptop,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppearanceSection } from "./AppearanceSection";
import { CaptureSection } from "./CaptureSection";
import { InsightsSection } from "./InsightsSection";
import { StorageSection } from "./StorageSection";
import { AboutSection } from "./AboutSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { AISection } from "./AISection";
import { ConnectionSection } from "./ConnectionSection";
import {
  checkForUpdateManual,
  getUpdateSettings,
  setUpdateCheckEnabled,
  type UpdateInfo,
  type UpdateSettings,
} from "../../services/updateService";
import {
  getAutomationStatus,
  openAutomationSettings,
  type AutomationSnapshot,
} from "../../services/automationService";
import {
  useSettingsStore,
  type ThemeMode,
  type BubblePosition,
  type LanguageMode,
} from "../../stores/settingsStore";
import { useDiagnosticsStore } from "../../stores/diagnosticsStore";
import {
  useAISettingsStore,
  DEFAULT_BASE_URLS,
  type AIProvider,
} from "../../stores/aiSettingsStore";
import { useAuthStore } from "../../stores/authStore";
import { useMcpConnectionStore } from "../../stores/mcpConnectionStore";

type AICatalog = {
  MODELS_BY_PROVIDER: Record<AIProvider, { id: string; label: string; free?: boolean }[]>;
  PROVIDER_LABELS: Record<AIProvider, string>;
};

const BUBBLE_POSITION_KEYS: { value: BubblePosition; key: string }[] = [
  { value: "bottom-right", key: "capture.positions.bottom-right" },
  { value: "bottom-center", key: "capture.positions.bottom-center" },
  { value: "bottom-left", key: "capture.positions.bottom-left" },
  { value: "top-right", key: "capture.positions.top-right" },
  { value: "top-center", key: "capture.positions.top-center" },
  { value: "top-left", key: "capture.positions.top-left" },
];

const THEME_OPTIONS: { value: ThemeMode; key: string; icon: LucideIcon }[] = [
  { value: "light", key: "theme.light", icon: Sun },
  { value: "dark", key: "theme.dark", icon: Moon },
  { value: "system", key: "theme.system", icon: Laptop },
];

const LANGUAGE_OPTIONS: { value: LanguageMode; key: string }[] = [
  { value: "system", key: "language.system" },
  { value: "zh-CN", key: "language.zh-CN" },
  { value: "en-US", key: "language.en-US" },
];

export function SettingsView() {
  const { t } = useTranslation("settings");
  const { t: tUpdate } = useTranslation("update");
  const { t: tAuto } = useTranslation("automation");
  const {
    theme,
    languageMode,
    captureEnabled,
    captureMode,
    bubbleStyle,
    bubblePosition,
    countdownDuration,
    sensitiveFilterEnabled,
    urlReadingEnabled,
    radarIntervalDays,
    screenshotDir,
    setTheme,
    setLanguageMode,
    setCaptureEnabled,
    setCaptureMode,
    setBubbleStyle,
    setBubblePosition,
    setCountdownDuration,
    setSensitiveFilterEnabled,
    defaultAction,
    setDefaultAction,
    setUrlReadingEnabled,
    setRadarIntervalDays,
  } = useSettingsStore();
  const { totalItems, diskUsageMB, loadXReaderStatus, refreshStorageInfo } = useDiagnosticsStore();
  const {
    apiKey,
    provider,
    model,
    customBaseUrl,
    setApiKey,
    setProvider,
    setModel,
    setCustomBaseUrl,
    loadFromDB: loadAISettings,
  } = useAISettingsStore();
  const {
    oauthLoggedIn,
    oauthEmail,
    oauthLoading,
    startOAuthLogin,
    logoutOAuth,
    geminiOauthLoggedIn,
    geminiOauthEmail,
    geminiOauthLoading,
    startGeminiOAuthLogin,
    logoutGeminiOAuth,
    loadAllAuthStatuses,
  } = useAuthStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState<string | null>(null);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const isLocalNoAuth = provider === "ollama" || provider === "lmstudio";
  const showsBaseUrl = isLocalNoAuth || provider === "custom";
  const mcpTargets = useMcpConnectionStore((s) => s.targets);
  const summaryCopied = useMcpConnectionStore((s) => s.summaryCopied);
  const mcpGlobalError = useMcpConnectionStore((s) => s.globalError);
  const loadMcpStatus = useMcpConnectionStore((s) => s.loadStatus);
  const connectMcpTarget = useMcpConnectionStore((s) => s.connectTarget);
  const disconnectMcpTarget = useMcpConnectionStore((s) => s.disconnectTarget);
  const copyContentSummary = useMcpConnectionStore((s) => s.copyContentSummary);

  useEffect(() => {
    void loadMcpStatus();
  }, [loadMcpStatus]);

  useEffect(() => {
    void loadAllAuthStatuses();
  }, [loadAllAuthStatuses]);

  useEffect(() => {
    void loadAISettings();
  }, [loadAISettings]);

  useEffect(() => {
    void loadXReaderStatus();
    void refreshStorageInfo();
  }, [loadXReaderStatus, refreshStorageInfo]);

  const categories = [
    { id: "appearance", label: t("sections.appearance"), icon: Palette },
    { id: "capture", label: t("sections.capture"), icon: Camera },
    { id: "radar", label: t("sections.insights"), icon: Target },
    { id: "ai", label: t("sections.ai"), icon: Bot },
    { id: "connect", label: t("sections.connection"), icon: LinkIcon },
    { id: "storage", label: t("sections.storage"), icon: HardDrive },
    { id: "about", label: tUpdate("settings.sectionTitle"), icon: Info },
    { id: "diagnostics", label: tAuto("settings.sectionTitle"), icon: Stethoscope },
  ];
  const [activeCategory, setActiveCategory] = useState("appearance");
  const [aiCatalog, setAiCatalog] = useState<AICatalog | null>(null);
  const [aiCatalogLoading, setAiCatalogLoading] = useState(false);
  const [aiCatalogLoadFailed, setAiCatalogLoadFailed] = useState(false);

  useEffect(() => {
    if (activeCategory !== "ai" || aiCatalog || aiCatalogLoading) return;
    let cancelled = false;
    setAiCatalogLoading(true);
    setAiCatalogLoadFailed(false);

    import("./aiCatalog")
      .then((mod) => {
        if (cancelled) return;
        setAiCatalog({
          MODELS_BY_PROVIDER: mod.MODELS_BY_PROVIDER,
          PROVIDER_LABELS: mod.PROVIDER_LABELS,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("Failed to load AI catalog:", e);
        setAiCatalogLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setAiCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, aiCatalog, aiCatalogLoading]);

  const [automationSnapshot, setAutomationSnapshot] = useState<AutomationSnapshot | null>(null);

  const refreshAutomation = useCallback(async () => {
    try {
      setAutomationSnapshot(await getAutomationStatus());
    } catch (e) {
      console.error("[automation] failed to load status:", e);
    }
  }, []);

  useEffect(() => {
    refreshAutomation();
  }, [refreshAutomation]);

  useEffect(() => {
    const handler = () => refreshAutomation();
    window.addEventListener("automation-granted", handler);
    window.addEventListener("automation-denied", handler);
    return () => {
      window.removeEventListener("automation-granted", handler);
      window.removeEventListener("automation-denied", handler);
    };
  }, [refreshAutomation]);

  const handleRequestAutomation = () => {
    window.dispatchEvent(new CustomEvent("automation-needed-manual"));
  };

  const handleOpenSystemSettings = async () => {
    try {
      await openAutomationSettings();
    } catch (e) {
      console.error("[automation] open settings failed:", e);
    }
  };

  const [updateSettings, setUpdateSettingsState] = useState<UpdateSettings | null>(null);
  const [checking, setChecking] = useState(false);
  const [latestInfo, setLatestInfo] = useState<UpdateInfo | null>(null);
  const [checkResult, setCheckResult] = useState<"up-to-date" | "error" | null>(null);
  const [checkError, setCheckError] = useState<string>("");

  useEffect(() => {
    getUpdateSettings()
      .then(setUpdateSettingsState)
      .catch((e) => console.error("[update] failed to load settings:", e));
  }, []);

  const handleCheckNow = async () => {
    setChecking(true);
    setCheckResult(null);
    setCheckError("");
    try {
      const info = await checkForUpdateManual();
      if (info) {
        setLatestInfo(info);
        window.dispatchEvent(
          new CustomEvent<UpdateInfo>("update-available-manual", { detail: info }),
        );
      } else {
        setLatestInfo(null);
        setCheckResult("up-to-date");
      }
    } catch (e) {
      setCheckResult("error");
      setCheckError(String(e));
    } finally {
      setChecking(false);
    }
  };

  const handleToggleAutoCheck = async (enabled: boolean) => {
    try {
      await setUpdateCheckEnabled(enabled);
      setUpdateSettingsState((prev) =>
        prev ? { ...prev, check_enabled: enabled } : prev,
      );
    } catch (e) {
      console.error("[update] failed to toggle auto-check:", e);
    }
  };

  const handleOpenReleases = async () => {
    if (!updateSettings) return;
    try {
      await openExternal(updateSettings.releases_url);
    } catch (e) {
      console.error("[update] failed to open releases page:", e);
    }
  };

  const providerLabels = aiCatalog?.PROVIDER_LABELS ?? null;
  const modelsByProvider = aiCatalog?.MODELS_BY_PROVIDER ?? null;
  const providerOptions = providerLabels
    ? (Object.entries(providerLabels) as [AIProvider, string][])
    : [];
  const currentProviderModels = modelsByProvider?.[provider] ?? [];

  return (
    <div className="flex" style={{ height: "calc(100vh - 44px)" }}>
      <div
        className="w-36 shrink-0 px-2 overflow-y-auto border-r flex flex-col"
        style={{ borderColor: "var(--color-border, #e5e5e5)" }}
      >
        <div className="flex-1 pt-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors
                  ${isActive
                    ? "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04]"
                  }
                `}
              >
                <Icon size={16} strokeWidth={2} />
                {cat.label}
              </button>
            );
          })}
        </div>
        <div className="py-3 px-3">
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            OpenWiki v{updateSettings?.current_version ?? "…"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className="w-full max-w-xl">
          {activeCategory === "appearance" && (
            <AppearanceSection
              theme={theme}
              languageMode={languageMode}
              setTheme={setTheme}
              setLanguageMode={setLanguageMode}
              themeOptions={THEME_OPTIONS}
              languageOptions={LANGUAGE_OPTIONS}
              t={t}
            />
          )}

          {activeCategory === "capture" && (
            <CaptureSection
              captureEnabled={captureEnabled}
              captureMode={captureMode}
              bubbleStyle={bubbleStyle}
              bubblePosition={bubblePosition}
              countdownDuration={countdownDuration}
              sensitiveFilterEnabled={sensitiveFilterEnabled}
              urlReadingEnabled={urlReadingEnabled}
              defaultAction={defaultAction}
              setCaptureEnabled={setCaptureEnabled}
              setCaptureMode={setCaptureMode}
              setBubbleStyle={setBubbleStyle}
              setBubblePosition={setBubblePosition}
              setCountdownDuration={setCountdownDuration}
              setSensitiveFilterEnabled={setSensitiveFilterEnabled}
              setDefaultAction={setDefaultAction}
              setUrlReadingEnabled={setUrlReadingEnabled}
              bubblePositionKeys={BUBBLE_POSITION_KEYS}
              t={t}
            />
          )}

          {activeCategory === "radar" && (
            <InsightsSection
              radarIntervalDays={radarIntervalDays}
              setRadarIntervalDays={setRadarIntervalDays}
              t={t}
            />
          )}

          {activeCategory === "ai" && (
            <AISection
              provider={provider}
              providerOptions={providerOptions}
              providerLabelsLoaded={!!providerLabels}
              currentProviderModels={currentProviderModels}
              aiCatalogLoadFailed={aiCatalogLoadFailed}
              showsBaseUrl={showsBaseUrl}
              isLocalNoAuth={isLocalNoAuth}
              customBaseUrl={customBaseUrl}
              model={model}
              draftApiKey={draftApiKey}
              apiKey={apiKey}
              showApiKey={showApiKey}
              apiKeySaved={apiKeySaved}
              testStatus={testStatus}
              testMessage={testMessage}
              oauthLoggedIn={oauthLoggedIn}
              oauthEmail={oauthEmail}
              oauthLoading={oauthLoading}
              geminiOauthLoggedIn={geminiOauthLoggedIn}
              geminiOauthEmail={geminiOauthEmail}
              geminiOauthLoading={geminiOauthLoading}
              defaultBaseUrl={DEFAULT_BASE_URLS[provider] || ""}
              onProviderChange={async (nextProvider) => {
                await setProvider(nextProvider);
                setDraftApiKey(null);
                setTestStatus("idle");
                setTestMessage("");
                setApiKeySaved(false);
              }}
              onCustomBaseUrlChange={setCustomBaseUrl}
              onModelChange={setModel}
              onDraftApiKeyChange={(value) => {
                setDraftApiKey(value);
                setApiKeySaved(false);
                setTestStatus("idle");
              }}
              onToggleShowApiKey={() => setShowApiKey(!showApiKey)}
              onSaveApiKey={() => {
                const key = draftApiKey ?? apiKey;
                setApiKey(key);
                setDraftApiKey(null);
                setApiKeySaved(true);
                setTimeout(() => setApiKeySaved(false), 2000);
              }}
              onTestConnection={async () => {
                const key = draftApiKey ?? apiKey;
                if (!key && !isLocalNoAuth && provider !== "custom") return;
                if (draftApiKey !== null && draftApiKey !== apiKey) {
                  setApiKey(draftApiKey);
                  setDraftApiKey(null);
                }
                setTestStatus("testing");
                setTestMessage("");
                try {
                  const result = await invoke<string>("test_ai_connection", {
                    provider,
                    model,
                    apiKey: key,
                    baseUrl: customBaseUrl,
                  });
                  setTestStatus("success");
                  setTestMessage(result);
                } catch (e) {
                  setTestStatus("error");
                  setTestMessage(typeof e === "string" ? e : String(e));
                }
              }}
              onOpenAIOAuthLogin={async () => {
                try {
                  await startOAuthLogin();
                } catch (e) {
                  alert(typeof e === "string" ? e : t("ai.oauthLoginFailed"));
                }
              }}
              onLogoutOAuth={logoutOAuth}
              onGeminiOAuthLogin={async () => {
                try {
                  await startGeminiOAuthLogin();
                } catch (e) {
                  alert(typeof e === "string" ? e : t("ai.oauthLoginFailed"));
                }
              }}
              onLogoutGeminiOAuth={logoutGeminiOAuth}
              t={t}
            />
          )}

          {activeCategory === "connect" && (
            <ConnectionSection
              mcpTargets={mcpTargets}
              summaryCopied={summaryCopied}
              mcpGlobalError={mcpGlobalError}
              connectMcpTarget={connectMcpTarget}
              disconnectMcpTarget={disconnectMcpTarget}
              copyContentSummary={copyContentSummary}
              t={t}
            />
          )}

          {activeCategory === "storage" && (
            <StorageSection
              totalItems={totalItems}
              diskUsageMB={diskUsageMB}
              screenshotDir={screenshotDir}
              onOpenDataFolder={() => {
                invoke("open_data_folder").catch((e) => console.error("open_data_folder failed:", e));
              }}
              t={t}
            />
          )}

          {activeCategory === "about" && (
            <AboutSection
              updateSettings={updateSettings}
              latestInfo={latestInfo}
              checkResult={checkResult}
              checkError={checkError}
              checking={checking}
              onToggleAutoCheck={handleToggleAutoCheck}
              onCheckNow={handleCheckNow}
              onOpenReleases={handleOpenReleases}
              tUpdate={tUpdate}
            />
          )}

          {activeCategory === "diagnostics" && (
            <DiagnosticsSection
              automationSnapshot={automationSnapshot}
              onRequestAutomation={handleRequestAutomation}
              onOpenSystemSettings={() => { void handleOpenSystemSettings(); }}
              tAuto={tAuto}
            />
          )}
        </div>
      </div>
    </div>
  );
}
