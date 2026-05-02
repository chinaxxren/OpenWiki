import { memo, lazy, Suspense } from "react";
import { ensureI18nNamespaces } from "./i18n";

export type TabId = "content" | "wiki" | "report" | "digest" | "datahub" | "settings";

export interface TabItem {
  id: TabId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MainTabsProps {
  activeTab: TabId;
  mountedTabs: Record<TabId, boolean>;
  loadingText: string;
}

const LazySettingsView = lazy(async () => {
  await ensureI18nNamespaces(["settings", "update", "automation"]);
  const m = await import("./features/settings/SettingsView");
  return { default: m.SettingsView };
});
const LazyContentList = lazy(async () => {
  await ensureI18nNamespaces(["content"]);
  const m = await import("./features/content-list/ContentList");
  return { default: m.ContentList };
});
const LazyDataHubView = lazy(async () => {
  await ensureI18nNamespaces(["dataHub"]);
  const m = await import("./features/data-hub/DataHubView");
  return { default: m.DataHubView };
});
const LazyRadarView = lazy(async () => {
  await ensureI18nNamespaces(["digest"]);
  const m = await import("./features/digest/RadarView");
  return { default: m.RadarView };
});
const LazyReportView = lazy(async () => {
  await ensureI18nNamespaces(["report"]);
  const m = await import("./features/weekly-report/ReportView");
  return { default: m.ReportView };
});
const LazyWikiView = lazy(async () => {
  await ensureI18nNamespaces(["wiki"]);
  const m = await import("./features/wiki/WikiView");
  return { default: m.WikiView };
});

export const MainTabs = memo(function MainTabs({
  activeTab,
  mountedTabs,
  loadingText,
}: MainTabsProps) {
  return (
    <main className="relative z-[1]">
      <div style={{ display: activeTab === "content" ? "block" : "none" }}>
        <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
          <LazyContentList />
        </Suspense>
      </div>
      <div style={{ display: activeTab === "wiki" ? "block" : "none" }}>
        {mountedTabs.wiki ? (
          <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
            <LazyWikiView />
          </Suspense>
        ) : null}
      </div>
      <div style={{ display: activeTab === "report" ? "block" : "none" }}>
        {mountedTabs.report ? (
          <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
            <LazyReportView />
          </Suspense>
        ) : null}
      </div>
      <div style={{ display: activeTab === "digest" ? "block" : "none" }}>
        {mountedTabs.digest ? (
          <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
            <LazyRadarView />
          </Suspense>
        ) : null}
      </div>
      <div style={{ display: activeTab === "datahub" ? "block" : "none" }}>
        {mountedTabs.datahub ? (
          <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
            <LazyDataHubView />
          </Suspense>
        ) : null}
      </div>
      <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
        {mountedTabs.settings ? (
          <Suspense fallback={<div className="px-6 py-8 text-sm text-gray-500 dark:text-slate-400">{loadingText}</div>}>
            <LazySettingsView />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
});
