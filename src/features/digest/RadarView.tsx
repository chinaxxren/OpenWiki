import { useEffect, Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { useRadarStore } from "../../stores/radarStore";
import { formatRadarDate } from "./radarViewLogic";
import { RadarReportContent } from "./RadarReportContent";
import { RadarStatusBlock, WikiLintSectionLazy } from "./RadarViewPieces";

const ACCENT = "#F97316";

class RadarErrorBoundary extends Component<{ children: ReactNode; errorTitle: string; retryLabel: string }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="px-5 py-8" style={{ color: "var(--color-text-primary)" }}>
          <h2 className="text-lg font-bold mb-2">{this.props.errorTitle}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{this.state.error}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 font-medium"
            style={{ fontSize: 13, color: ACCENT }}
          >
            {this.props.retryLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RadarView() {
  const { t } = useTranslation("digest");
  return (
    <RadarErrorBoundary errorTitle={t("radar.errorTitle")} retryLabel={t("radar.retry")}>
      <RadarViewInner />
    </RadarErrorBoundary>
  );
}

function RadarViewInner() {
  const { t } = useTranslation("digest");
  const {
    status,
    analysis,
    report,
    windowStart,
    windowEnd,
    hasNewContent,
    errorMessage,
    isLoading,
    loadRadar,
    triggerAnalysis,
    setupEventListener,
  } = useRadarStore();

  const rangeStart = formatRadarDate(windowStart);
  const rangeEnd = formatRadarDate(windowEnd);

  useEffect(() => {
    loadRadar();
    let unlisten: (() => void) | undefined;
    setupEventListener().then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [loadRadar, setupEventListener]);

  const isAnalyzing = status === "analyzing";
  const hasReport = report !== null;
  const hasLegacy = analysis !== null && (analysis.topics?.length ?? 0) > 0;
  const hasFindings = hasReport || hasLegacy;

  return (
    <div className="overflow-y-auto" style={{ height: "calc(100vh - 44px)", color: "var(--color-text-primary)" }}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2
            style={{
              fontSize: 22,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.3px",
            }}
          >
            {t("radar.title")}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => triggerAnalysis()}
              disabled={isAnalyzing || !hasNewContent}
              className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300
                         hover:bg-stone-100 dark:hover:bg-white/[0.08]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title={t("radar.refreshTitle")}
            >
              <RefreshCw size={18} strokeWidth={2} className={isAnalyzing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        {!isLoading && hasFindings && (
          <>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {t("radar.subtitle")}
            </p>
            {rangeStart && rangeEnd && (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                {t("radar.window", { start: rangeStart, end: rangeEnd })}
              </p>
            )}
          </>
        )}
      </div>

      <div className="px-5 pb-8">
        <RadarStatusBlock
          status={status}
          isLoading={isLoading}
          hasFindings={hasFindings}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          onRetry={() => triggerAnalysis()}
          t={t}
        />

        {!isLoading && hasFindings && (
          <RadarReportContent
            report={report}
            analysis={analysis}
            hasReport={hasReport}
            hasLegacy={hasLegacy}
            isAnalyzing={isAnalyzing}
            t={t}
          />
        )}

        <WikiLintSectionLazy />
      </div>
    </div>
  );
}
