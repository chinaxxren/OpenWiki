import { useEffect, useState, type ReactNode } from "react";
import { Key, RefreshCw, Search, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

export function RadarEmptyState({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
      {icon}
      <p className="text-base font-medium mb-1">{title}</p>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{desc}</p>
    </div>
  );
}

export function RadarLoadingSkeleton() {
  return (
    <div className="space-y-3 mt-6">
      <div className="h-20 bg-stone-100 dark:bg-white/[0.06] rounded-xl animate-pulse" />
      <div className="h-48 bg-stone-100 dark:bg-white/[0.06] rounded-xl animate-pulse" />
      <div className="h-32 bg-stone-100 dark:bg-white/[0.06] rounded-xl animate-pulse" />
    </div>
  );
}

export function RadarAnalyzingSkeleton() {
  const { t } = useTranslation("digest");
  return (
    <div className="space-y-3 mt-6">
      <div className="h-20 bg-stone-100 dark:bg-white/[0.06] rounded-xl animate-pulse" />
      <div className="h-48 bg-stone-100 dark:bg-white/[0.06] rounded-xl animate-pulse" />
      <div className="text-center py-4">
        <RefreshCw size={16} className="animate-spin text-stone-400 mx-auto mb-2" />
        <p className="text-stone-400" style={{ fontSize: 13 }}>{t("radar.analyzing")}</p>
      </div>
    </div>
  );
}

export function RadarStatusBlock({
  status,
  isLoading,
  hasFindings,
  isAnalyzing,
  errorMessage,
  onRetry,
  t,
}: {
  status: string;
  isLoading: boolean;
  hasFindings: boolean;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  t: (key: string) => string;
}) {
  if (isLoading) return <RadarLoadingSkeleton />;

  if (status === "no_api_key") {
    return (
      <RadarEmptyState
        icon={<Key size={48} className="text-stone-300 dark:text-stone-600 mb-4" strokeWidth={1.5} />}
        title={t("radar.emptyNeedApiKey.title")}
        desc={t("radar.emptyNeedApiKey.desc")}
      />
    );
  }

  if (status === "not_enough_content") {
    return (
      <RadarEmptyState
        icon={<Target size={48} className="text-stone-300 dark:text-stone-600 mb-4" strokeWidth={1.5} />}
        title={t("radar.emptyNotEnough.title")}
        desc={t("radar.emptyNotEnough.desc")}
      />
    );
  }

  if (!isAnalyzing && !hasFindings && status !== "error") {
    return (
      <RadarEmptyState
        icon={<Search size={48} className="text-stone-300 dark:text-stone-600 mb-4" strokeWidth={1.5} />}
        title={t("radar.emptyScattered.title")}
        desc={t("radar.emptyScattered.desc")}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <p className="text-red-700 dark:text-red-400 mb-2" style={{ fontSize: 13 }}>
          {errorMessage || t("radar.errorDefault")}
        </p>
        <button onClick={onRetry} className="font-medium hover:underline" style={{ fontSize: 13, color: "#F97316" }}>
          {t("radar.reanalyze")}
        </button>
      </div>
    );
  }

  if (isAnalyzing && !hasFindings) {
    return <RadarAnalyzingSkeleton />;
  }

  return null;
}

export function WikiLintSectionLazy() {
  const [WikiLint, setWikiLint] = useState<React.ComponentType<{ compact?: boolean }> | null>(null);
  useEffect(() => {
    import("../wiki/WikiLintSection").then((m) => setWikiLint(() => m.WikiLintSection));
  }, []);
  if (!WikiLint) return null;
  return (
    <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--color-border, #E7E5E4)" }}>
      <WikiLint compact />
    </div>
  );
}
