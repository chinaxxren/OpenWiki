import {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
  memo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Import,
  Inbox,
  Link2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useContentNavigationStore } from "../../stores/contentNavigationStore";
import { useContentStore } from "../../stores/contentStore";
import { useResolvedContents } from "../../stores/contentEntitiesStore";
import { useContentListPage } from "./useContentListPage";
import { useContentListEffects } from "./useContentListEffects";
import { useContentReloadQueue } from "./useContentReloadQueue";
import { useContentImport } from "./useContentImport";
import { ImportNotice } from "./ImportNotice";
import { ImportPanel } from "./ImportPanel";
import { ContentListToolbar } from "./ContentListToolbar";
import {
  countCommaSeparatedTags,
  getContentListBucket,
  getImportKind,
} from "./contentListLogic";
import { exportAllSingle, exportRangeSingle } from "../../services/dataHubService";
import { useSettingsStore } from "../../stores/settingsStore";
import { ContentCard } from "./ContentCard";
import type { CapturedContent, ContentType } from "../../types/content";

type FilterType = "all" | ContentType;
type DateRange = "all" | "today" | "week" | "half-month";
type ContentFilter = FilterType | "document";

const FILTER_TABS: { value: ContentFilter; labelKey: string; icon: LucideIcon }[] = [
  { value: "all", labelKey: "filter.all", icon: ClipboardList },
  { value: "text", labelKey: "filter.text", icon: FileText },
  { value: "image", labelKey: "filter.image", icon: ImageIcon },
  { value: "url", labelKey: "filter.url", icon: Link2 },
  { value: "document", labelKey: "filter.document", icon: Import },
];

const IMPORT_ACCEPT = [
  ".md",
  ".markdown",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".pdf",
  ".docx",
  ".pptx",
  "text/markdown",
  "text/x-markdown",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
].join(",");

const SUPPORTED_IMPORT_FORMATS = ["Markdown", "TXT", "PNG", "JPG", "WebP", "GIF", "PDF", "DOCX", "PPTX"];
const FUTURE_IMPORT_FORMATS = ["DOC", "PPT"];

const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    const data = result.includes(",") ? result.split(",")[1] : result;
    if (data) {
      resolve(data);
    } else {
      reject(new Error("Empty file data"));
    }
  };
  reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
  reader.readAsDataURL(file);
});

const CARD_MOUNT_ROOT_MARGIN = "720px 0px";
const CARD_PLACEHOLDER_MIN_HEIGHT = 156;
const CARD_PLACEHOLDER_MAX_HEIGHT = 280;
const FILTER_PERF_LOG_THRESHOLD_MS = 8;

function estimateCardPlaceholderHeight({
  contentType,
  rawLen,
  summaryLen,
  hasUserNote,
  tagCount,
  isFailedUrl,
  hasWikiCompileHash,
}: {
  contentType: CapturedContent["content_type"];
  rawLen: number;
  summaryLen: number;
  hasUserNote: boolean;
  tagCount: number;
  isFailedUrl: boolean;
  hasWikiCompileHash: boolean;
}): number {
  let height = contentType === "image" ? 228 : 168;
  const hasLongPreview = summaryLen > 64 || rawLen > 120;
  if (hasLongPreview) height += 18;

  if (hasUserNote) height += 24;
  if (tagCount >= 3) height += 18;
  else if (tagCount > 0) height += 10;
  if (isFailedUrl) height += 24;
  if (hasWikiCompileHash) height += 16;

  return Math.min(CARD_PLACEHOLDER_MAX_HEIGHT, Math.max(CARD_PLACEHOLDER_MIN_HEIGHT, height));
}

interface SharedCardMountObserver {
  key: string;
  refs: number;
  callbacks: WeakMap<Element, () => void>;
  observer: IntersectionObserver;
}

const sharedMountObservers = new Map<string, SharedCardMountObserver>();
const sharedMountRootIds = new WeakMap<Element, number>();
let sharedMountRootIdSeed = 0;

function getSharedMountRootKey(root: Element | null): string {
  if (!root) return "viewport";
  const existing = sharedMountRootIds.get(root);
  if (existing) return `root-${existing}`;
  const next = ++sharedMountRootIdSeed;
  sharedMountRootIds.set(root, next);
  return `root-${next}`;
}

function acquireSharedMountObserver(
  root: Element | null,
  rootMargin: string
): SharedCardMountObserver {
  const key = `${getSharedMountRootKey(root)}|${rootMargin}`;
  const existing = sharedMountObservers.get(key);
  if (existing) {
    existing.refs += 1;
    return existing;
  }

  const callbacks = new WeakMap<Element, () => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = callbacks.get(entry.target);
        if (callback) callback();
      }
    },
    { root, rootMargin, threshold: 0 }
  );

  const created: SharedCardMountObserver = {
    key,
    refs: 1,
    callbacks,
    observer,
  };
  sharedMountObservers.set(key, created);
  return created;
}

function releaseSharedMountObserver(key: string) {
  const current = sharedMountObservers.get(key);
  if (!current) return;
  current.refs -= 1;
  if (current.refs <= 0) {
    current.observer.disconnect();
    sharedMountObservers.delete(key);
  }
}

interface LazyMountContentCardProps {
  content: CapturedContent;
  isHighlighted: boolean;
  itemRef: (el: HTMLDivElement | null) => void;
  placeholderHeight: number;
  scrollRoot: HTMLDivElement | null;
}

const LazyMountContentCard = memo(function LazyMountContentCard({
  content,
  isHighlighted,
  itemRef,
  placeholderHeight,
  scrollRoot,
}: LazyMountContentCardProps) {
  const [mounted, setMounted] = useState(() => typeof IntersectionObserver === "undefined");
  const hostRef = useRef<HTMLDivElement | null>(null);

  const setHostRef = useCallback((el: HTMLDivElement | null) => {
    hostRef.current = el;
    itemRef(el);
  }, [itemRef]);

  useEffect(() => {
    if (mounted) return;
    const host = hostRef.current;
    if (!host) return;
    const shared = acquireSharedMountObserver(scrollRoot, CARD_MOUNT_ROOT_MARGIN);

    const onIntersect = () => {
      setMounted(true);
      shared.callbacks.delete(host);
      shared.observer.unobserve(host);
    };

    shared.callbacks.set(host, onIntersect);
    shared.observer.observe(host);

    return () => {
      shared.callbacks.delete(host);
      shared.observer.unobserve(host);
      releaseSharedMountObserver(shared.key);
    };
  }, [mounted, scrollRoot]);

  return (
    <div ref={setHostRef} style={{ minHeight: placeholderHeight }}>
      {mounted ? (
        <ContentCard
          content={content}
          isHighlighted={isHighlighted}
        />
      ) : (
        <div
          className={`glass rounded-2xl border border-white/40 dark:border-white/[0.04] animate-pulse ${
            isHighlighted ? "ring-2 ring-orange-300/60 dark:ring-orange-500/30" : ""
          }`}
          style={{ minHeight: placeholderHeight }}
        />
      )}
    </div>
  );
});

export function ContentList() {
  const { t } = useTranslation("content");
  const contentIds = useContentStore((s) => s.contentIds);
  const highlightedIds = useContentNavigationStore((s) => s.highlightedIds);
  const scrollToId = useContentNavigationStore((s) => s.scrollToId);
  const setScrollToId = useContentNavigationStore((s) => s.setScrollToId);
  const clearHighlights = useContentNavigationStore((s) => s.clearHighlights);
  const setHighlightedIds = useContentNavigationStore((s) => s.setHighlightedIds);
  const captureEnabled = useSettingsStore((s) => s.captureEnabled);
  const sensitiveFilterEnabled = useSettingsStore((s) => s.sensitiveFilterEnabled);
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [exportStatus, setExportStatus] = useState<"idle" | "confirm" | "exporting" | "done">("idle");
  const [scrollRootEl, setScrollRootEl] = useState<HTMLDivElement | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importPanelRef = useRef<HTMLDivElement>(null);
  const loadedContentIdSetRef = useRef<Set<string>>(new Set());

  // Refs for scroll-to-item and infinite scroll sentinel
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const {
    serverTypeCounts,
    hasMore,
    totalCount,
    isLoading,
    isLoadingMore,
    filterConstraintScore,
    filteredLoadPageSize,
    hasActiveFilterConstraint,
    emptyFilterPrefetchBudget,
    emptyFilterPrefetchRemaining,
    loadInitial,
    loadMore,
    setEmptyFilterPrefetchRemaining,
  } = useContentListPage({
    filter,
    dateRange,
    sensitiveFilterEnabled,
  });

  const setScrollContainerRef = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
    setScrollRootEl(el);
  }, []);

  const scheduleExportStatusReset = useCallback((delayMs: number) => {
    if (exportStatusResetTimerRef.current) {
      clearTimeout(exportStatusResetTimerRef.current);
    }
    exportStatusResetTimerRef.current = setTimeout(() => setExportStatus("idle"), delayMs);
  }, []);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (exportStatusResetTimerRef.current) clearTimeout(exportStatusResetTimerRef.current);
    },
    []
  );

  const contents = useResolvedContents(contentIds);
  const {
    importStatus,
    importMessage,
    isImportTakingLong,
    isImportPanelOpen,
    isImportBusy,
    openImportPanel,
    handleChooseFiles,
    handleContentImport,
  } = useContentImport({
    importInputRef,
    importPanelRef,
    getImportKind,
    readFileAsBase64,
    loadInitial,
    setHighlightedIds,
    t,
  });

  useContentListEffects({
    contents,
    scrollToId,
    highlightedIds,
    cardRefs,
    loadedContentIdSetRef,
    setFilter,
    setDateRange,
    setScrollToId,
    clearHighlights,
  });

  const loadedContentIds = useMemo(
    () => new Set(contents.map((content) => content.id)),
    [contents]
  );
  useContentReloadQueue({ loadedContentIds });

  const typeCounts = useMemo<Record<string, number>>(() => {
    if (serverTypeCounts) {
      return {
        all: serverTypeCounts.all,
        text: serverTypeCounts.text,
        image: serverTypeCounts.image,
        url: serverTypeCounts.url,
        document: serverTypeCounts.document,
      };
    }
    const counts: Record<string, number> = { all: totalCount };
    for (const content of contents) {
      const bucket = getContentListBucket(content);
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
    return counts;
  }, [serverTypeCounts, contents, totalCount]);

  const {
    filteredContents,
    filterCostMs,
  } = useMemo(() => {
    return {
      filteredContents: contents,
      filterCostMs: 0,
    };
  }, [contents]);

  const canObserveLoadMore = hasMore;

  // When filters produce zero visible items, proactively fetch a few more batches
  // to reduce "empty until manual scroll" time without unbounded background loading.
  useEffect(() => {
    if (!hasActiveFilterConstraint) return;
    if (isLoading || isLoadingMore) return;
    if (!hasMore) return;
    if (filteredContents.length > 0) return;
    if (emptyFilterPrefetchRemaining <= 0) return;
    const started = loadMore();
    if (started) {
      setEmptyFilterPrefetchRemaining(
        emptyFilterPrefetchRemaining - 1,
        "prefetch-started"
      );
    }
  }, [
    hasActiveFilterConstraint,
    isLoading,
    isLoadingMore,
    hasMore,
    filteredContents.length,
    emptyFilterPrefetchRemaining,
    loadMore,
    setEmptyFilterPrefetchRemaining,
  ]);

  // Infinite scroll: observe a sentinel near the bottom instead of
  // running calculations on every scroll event.
  useEffect(() => {
    if (!canObserveLoadMore) return;
    const root = scrollRootEl;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: "320px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canObserveLoadMore, loadMore, scrollRootEl]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (filterCostMs < FILTER_PERF_LOG_THRESHOLD_MS) return;
    console.debug(
      `[perf] ContentList filter ${filterCostMs.toFixed(1)}ms`,
      {
        total: contents.length,
        filtered: filteredContents.length,
        filter,
        dateRange,
        sensitiveFilterEnabled,
        filterConstraintScore,
        filteredLoadPageSize,
        emptyFilterPrefetchBudget: hasActiveFilterConstraint ? emptyFilterPrefetchBudget : 0,
        emptyFilterPrefetchRemaining: hasActiveFilterConstraint ? emptyFilterPrefetchRemaining : 0,
      }
    );
  }, [
    filterCostMs,
    contents.length,
    filteredContents.length,
    filter,
    dateRange,
    sensitiveFilterEnabled,
    filterConstraintScore,
    filteredLoadPageSize,
    hasActiveFilterConstraint,
    emptyFilterPrefetchBudget,
    emptyFilterPrefetchRemaining,
  ]);

  const highlightedIdSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  const getPlaceholderHeight = useCallback((content: CapturedContent): number => {
    const rawText = content.raw_text ?? "";
    const rawLen = content.raw_text_length ?? rawText.length;
    const summaryLen = content.summary?.length ?? 0;
    const hasUserNote = !!content.user_note;
    const hasWikiCompileHash = !!content.wiki_compile_hash;
    const isFailedUrl = content.content_type === "url" && rawText.startsWith("[读取失败]");
    const tagCount = content.tags ? countCommaSeparatedTags(content.tags) : 0;

    return estimateCardPlaceholderHeight({
      contentType: content.content_type,
      rawLen,
      summaryLen,
      hasUserNote,
      tagCount,
      isFailedUrl,
      hasWikiCompileHash,
    });
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <ImportNotice
          importStatus={importStatus}
          importMessage={importMessage}
          isImportTakingLong={isImportTakingLong}
          isImportBusy={isImportBusy}
          t={t}
        />
        <div className="flex items-center justify-between px-1">
          <div className="h-6 w-32 bg-white/50 dark:bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-5 w-16 bg-white/50 dark:bg-white/[0.06] rounded-full animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-500/10 dark:bg-orange-500/10 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200/50 dark:bg-white/[0.06] rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200/30 dark:bg-white/[0.04] rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-gray-200/30 dark:bg-white/[0.04] rounded w-1/3 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <ImportNotice
          importStatus={importStatus}
          importMessage={importMessage}
          isImportTakingLong={isImportTakingLong}
          isImportBusy={isImportBusy}
          t={t}
        />
        <input
          ref={importInputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          multiple
          className="hidden"
          onChange={handleContentImport}
        />
        <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-5">
          <Inbox className="w-10 h-10 text-orange-400/80" />
        </div>
        <div className="font-medium text-gray-600 dark:text-slate-300 mb-2">
          {t("emptyTitle")}
        </div>
        <div className="text-sm text-gray-400 dark:text-slate-500 text-center max-w-xs">
          {t("emptyHint")}
        </div>
        <div ref={importPanelRef} className="relative mt-5">
          <button
            onClick={openImportPanel}
            disabled={isImportBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-60"
            style={{
              color: "#F97316",
              backgroundColor: "#FFF7ED",
              borderColor: "#F9731630",
            }}
          >
            <Import size={16} />
            {isImportBusy ? t("import.importing") : t("import.button")}
          </button>
          {isImportPanelOpen ? (
            <ImportPanel
              align="center"
              isImportBusy={isImportBusy}
              importStatus={importStatus}
              supportedFormats={SUPPORTED_IMPORT_FORMATS}
              futureFormats={FUTURE_IMPORT_FORMATS}
              onChooseFiles={handleChooseFiles}
              t={t}
            />
          ) : null}
        </div>
        {importStatus !== "idle" && importMessage && (
          <div className={`mt-2 text-xs ${importStatus === "error" ? "text-red-500" : "text-stone-400 dark:text-stone-500"}`}>
            {importMessage}
          </div>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${captureEnabled ? "bg-green-400 animate-pulse" : "bg-gray-300 dark:bg-slate-600"}`} />
          <span className="text-gray-400 dark:text-slate-500">
            {captureEnabled ? t("captureOn") : t("captureOff")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={setScrollContainerRef} className="overflow-y-auto p-4 space-y-3" style={{ height: "calc(100vh - 44px)" }}>
      <ImportNotice
        importStatus={importStatus}
        importMessage={importMessage}
        isImportTakingLong={isImportTakingLong}
        isImportBusy={isImportBusy}
        t={t}
      />
      <input
        ref={importInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        multiple
        className="hidden"
        onChange={handleContentImport}
      />
      <ContentListToolbar
        filterTabs={FILTER_TABS}
        typeCounts={typeCounts}
        filter={filter}
        setFilter={setFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        importPanelRef={importPanelRef}
        openImportPanel={openImportPanel}
        isImportBusy={isImportBusy}
        isImportPanelOpen={isImportPanelOpen}
        importStatus={importStatus}
        supportedFormats={SUPPORTED_IMPORT_FORMATS}
        futureFormats={FUTURE_IMPORT_FORMATS}
        onChooseFiles={handleChooseFiles}
        exportStatus={exportStatus}
        onExportClick={async () => {
          if (exportStatus === "idle") {
            setExportStatus("confirm");
            if (confirmTimer.current) clearTimeout(confirmTimer.current);
            confirmTimer.current = setTimeout(() => setExportStatus("idle"), 3000);
            return;
          }
          if (exportStatus === "confirm") {
            if (confirmTimer.current) clearTimeout(confirmTimer.current);
            if (exportStatusResetTimerRef.current) {
              clearTimeout(exportStatusResetTimerRef.current);
            }
            setExportStatus("exporting");
            try {
              if (dateRange === "all") {
                await exportAllSingle();
              } else {
                const now = new Date();
                const end = now.toISOString().slice(0, 10);
                const start = new Date();
                if (dateRange === "today") start.setHours(0, 0, 0, 0);
                else if (dateRange === "week") start.setDate(now.getDate() - 7);
                else if (dateRange === "half-month") start.setDate(now.getDate() - 15);
                await exportRangeSingle(start.toISOString().slice(0, 10), end);
              }
              setExportStatus("done");
              scheduleExportStatusReset(3000);
            } catch (e) {
              console.error(e);
              setExportStatus("idle");
            }
          }
        }}
        captureEnabled={captureEnabled}
        t={t}
      />

      {importStatus !== "idle" && importMessage && (
        <div className={`px-1 text-xs ${importStatus === "error" ? "text-red-500" : "text-stone-400 dark:text-stone-500"}`}>
          {importMessage}
        </div>
      )}

      {/* Content cards */}
      {filteredContents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 mb-3 text-orange-400/80" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("emptyFilter", { type: t(FILTER_TABS.find((tab) => tab.value === filter)?.labelKey ?? "filter.all") })}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredContents.map((content) => (
            <LazyMountContentCard
              key={content.id}
              content={content}
              isHighlighted={highlightedIdSet.has(content.id)}
              itemRef={(el) => {
                cardRefs.current[content.id] = el;
              }}
              placeholderHeight={getPlaceholderHeight(content)}
              scrollRoot={scrollRootEl}
            />
          ))}
        </div>
      )}
      {hasMore && <div ref={loadMoreSentinelRef} className="h-px w-full" aria-hidden />}
      {hasMore && isLoadingMore && (
        <div className="flex justify-center py-4">
          <span className="text-xs text-gray-400 dark:text-slate-500 animate-pulse">
            {t("loading", "加载中...")}
          </span>
        </div>
      )}
    </div>
  );
}
