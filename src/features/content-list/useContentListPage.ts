import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContentDeletionEventStore } from "../../stores/contentDeletionEventStore";
import { useContentStore } from "../../stores/contentStore";
import { useContentListQueryStore } from "../../stores/contentListQueryStore";
import { useDiagnosticsStore } from "../../stores/diagnosticsStore";
import {
  getContentListBucket,
  matchesContentListQuery,
} from "../../lib/contentListQuery";
import type { ContentListCounts } from "../../services/storageService";
import {
  fetchContentListPage,
  type ContentListDateRange,
  type ContentListFilter,
} from "../../services/contentListService";
import {
  getEmptyFilterPrefetchBudget,
  getFilteredLoadPageSize,
  getFilterConstraintScore,
} from "./contentListLogic";

const PAGE_SIZE = 50;
const FOCUS_REFRESH_MIN_INTERVAL_MS = 3000;
const PREFETCH_STATE_LOG_THROTTLE_MS = 1000;

interface UseContentListPageOptions {
  filter: ContentListFilter;
  dateRange: ContentListDateRange;
  sensitiveFilterEnabled: boolean;
}

interface UseContentListPageResult {
  serverTypeCounts: ContentListCounts | null;
  hasMore: boolean;
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  filterConstraintScore: number;
  filteredLoadPageSize: number;
  hasActiveFilterConstraint: boolean;
  emptyFilterPrefetchBudget: number;
  emptyFilterPrefetchRemaining: number;
  loadInitial: () => Promise<void>;
  loadMore: () => boolean;
  setEmptyFilterPrefetchRemaining: (next: number, reason: string) => void;
}

export function useContentListPage({
  filter,
  dateRange,
  sensitiveFilterEnabled,
}: UseContentListPageOptions): UseContentListPageResult {
  const isLoading = useContentStore((s) => s.isLoading);
  const setContents = useContentStore((s) => s.setContents);
  const setIsLoading = useContentStore((s) => s.setIsLoading);
  const hasMore = useContentStore((s) => s.hasMore);
  const totalCount = useContentStore((s) => s.totalCount);
  const isLoadingMore = useContentStore((s) => s.isLoadingMore);
  const setHasMore = useContentStore((s) => s.setHasMore);
  const setTotalCount = useContentStore((s) => s.setTotalCount);
  const setIsLoadingMore = useContentStore((s) => s.setIsLoadingMore);
  const setActiveQuery = useContentListQueryStore((s) => s.setActiveQuery);
  const appendContents = useContentStore((s) => s.appendContents);
  const lastDeletedContent = useContentDeletionEventStore((s) => s.lastDeletedContent);
  const lastDeletedContentVersion = useContentDeletionEventStore((s) => s.lastDeletedContentVersion);
  const setStorageInfo = useDiagnosticsStore((s) => s.setStorageInfo);

  const [serverTypeCounts, setServerTypeCounts] = useState<ContentListCounts | null>(null);
  const loadInitialLockRef = useRef(false);
  const loadMoreLockRef = useRef(false);
  const lastInitialLoadedAtRef = useRef(0);
  const emptyFilterPrefetchConditionKeyRef = useRef("");
  const emptyFilterPrefetchPolicyKeyRef = useRef("");
  const emptyFilterPrefetchRemainingRef = useRef(0);
  const contentQuerySeqRef = useRef(0);
  const pendingServerReloadRef = useRef(false);
  const loadInitialRef = useRef<() => Promise<void>>(async () => undefined);
  const prefetchLogMetaRef = useRef<{ lastAt: number; lastReason: string; skipped: number }>({
    lastAt: 0,
    lastReason: "",
    skipped: 0,
  });
  const previousServerQueryKeyRef = useRef("");

  const filterConstraintScore = useMemo(
    () => getFilterConstraintScore(filter, dateRange, sensitiveFilterEnabled),
    [filter, dateRange, sensitiveFilterEnabled]
  );
  const hasActiveFilterConstraint = filterConstraintScore > 0;
  const filteredLoadPageSize = useMemo(
    () => getFilteredLoadPageSize(filterConstraintScore),
    [filterConstraintScore]
  );
  const emptyFilterPrefetchBudget = useMemo(
    () => getEmptyFilterPrefetchBudget(hasActiveFilterConstraint, filterConstraintScore),
    [hasActiveFilterConstraint, filterConstraintScore]
  );

  const setEmptyFilterPrefetchRemaining = useCallback((next: number, reason: string) => {
    const normalized = Math.max(0, next);
    if (emptyFilterPrefetchRemainingRef.current === normalized) return;
    emptyFilterPrefetchRemainingRef.current = normalized;
    if (!import.meta.env.DEV) return;
    const now = Date.now();
    const logMeta = prefetchLogMetaRef.current;
    const isPrefetchStep = reason === "prefetch-started";
    const shouldThrottle = isPrefetchStep
      && normalized > 0
      && logMeta.lastReason === reason
      && (now - logMeta.lastAt) < PREFETCH_STATE_LOG_THROTTLE_MS;
    if (shouldThrottle) {
      logMeta.skipped += 1;
      return;
    }
    const skipped = logMeta.skipped;
    prefetchLogMetaRef.current = { lastAt: now, lastReason: reason, skipped: 0 };
    console.debug("[perf] ContentList prefetch remaining", {
      reason,
      remaining: normalized,
      budget: hasActiveFilterConstraint ? emptyFilterPrefetchBudget : 0,
      filter,
      dateRange,
      sensitiveFilterEnabled,
      filterConstraintScore,
      filteredLoadPageSize,
      skipped,
    });
  }, [
    hasActiveFilterConstraint,
    emptyFilterPrefetchBudget,
    filter,
    dateRange,
    sensitiveFilterEnabled,
    filterConstraintScore,
    filteredLoadPageSize,
  ]);

  const loadInitial = useCallback(async () => {
    const requestId = ++contentQuerySeqRef.current;
    const queryKey = previousServerQueryKeyRef.current;
    if (loadInitialLockRef.current) {
      pendingServerReloadRef.current = true;
      return;
    }
    loadInitialLockRef.current = true;
    loadMoreLockRef.current = true;
    setIsLoading(true);
    try {
      const initialPage = await fetchContentListPage({
        filter,
        dateRange,
        excludeSensitive: sensitiveFilterEnabled,
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (
        requestId !== contentQuerySeqRef.current ||
        queryKey !== previousServerQueryKeyRef.current
      ) {
        return;
      }
      setServerTypeCounts(initialPage.counts);
      if (filter === "all" && dateRange === "all" && !sensitiveFilterEnabled) {
        setStorageInfo(initialPage.matchingItems, initialPage.diskUsageMb);
      }
      setTotalCount(initialPage.matchingItems);
      setContents(initialPage.contents);
      setHasMore(initialPage.contents.length < initialPage.matchingItems);
      lastInitialLoadedAtRef.current = Date.now();
    } catch (e) {
      console.error("Failed to load content:", e);
    } finally {
      loadInitialLockRef.current = false;
      loadMoreLockRef.current = false;
      setIsLoading(false);
      if (pendingServerReloadRef.current) {
        pendingServerReloadRef.current = false;
        void loadInitialRef.current();
      }
    }
  }, [
    sensitiveFilterEnabled,
    filter,
    dateRange,
    setContents,
    setIsLoading,
    setStorageInfo,
    setTotalCount,
    setHasMore,
  ]);
  loadInitialRef.current = loadInitial;

  const loadMore = useCallback((): boolean => {
    const state = useContentStore.getState();
    if (
      loadMoreLockRef.current ||
      loadInitialLockRef.current ||
      state.isLoadingMore ||
      !state.hasMore
    ) {
      return false;
    }
    loadMoreLockRef.current = true;
    setIsLoadingMore(true);
    const requestId = contentQuerySeqRef.current;
    const queryKey = previousServerQueryKeyRef.current;
    const offset = state.contentIds.length;
    const limit = filteredLoadPageSize;

    void (async () => {
      try {
        const data = (await fetchContentListPage({
          filter,
          dateRange,
          excludeSensitive: sensitiveFilterEnabled,
          limit,
          offset,
        })).contents;
        if (
          requestId !== contentQuerySeqRef.current ||
          queryKey !== previousServerQueryKeyRef.current
        ) {
          return;
        }
        appendContents(data);
        const nextCount = offset + data.length;
        if (
          data.length < limit ||
          (state.totalCount > 0 && nextCount >= state.totalCount)
        ) {
          setHasMore(false);
        }
      } catch (e) {
        console.error("Failed to load more:", e);
      } finally {
        loadMoreLockRef.current = false;
        setIsLoadingMore(false);
      }
    })();

    return true;
  }, [
    appendContents,
    setIsLoadingMore,
    setHasMore,
    filteredLoadPageSize,
    sensitiveFilterEnabled,
    filter,
    dateRange,
  ]);

  useEffect(() => {
    setActiveQuery(filter, dateRange, sensitiveFilterEnabled);
  }, [filter, dateRange, sensitiveFilterEnabled, setActiveQuery]);

  useEffect(() => {
    if (!lastDeletedContent) return;
    if (!matchesContentListQuery(lastDeletedContent, filter, dateRange, sensitiveFilterEnabled)) {
      return;
    }
    setServerTypeCounts((previous) => {
      if (!previous) return previous;
      const bucket = getContentListBucket(lastDeletedContent);
      const nextCounts: ContentListCounts = {
        ...previous,
        all: Math.max(0, previous.all - 1),
      };
      if (bucket !== "mixed") {
        nextCounts[bucket] = Math.max(0, previous[bucket] - 1);
      }
      return nextCounts;
    });
  }, [
    lastDeletedContent,
    lastDeletedContentVersion,
    filter,
    dateRange,
    sensitiveFilterEnabled,
  ]);

  useEffect(() => {
    const nextQueryKey = [
      filter,
      dateRange,
      sensitiveFilterEnabled ? "1" : "0",
    ].join("|");
    if (
      lastInitialLoadedAtRef.current === 0 ||
      previousServerQueryKeyRef.current !== nextQueryKey
    ) {
      previousServerQueryKeyRef.current = nextQueryKey;
      void loadInitial();
    }
  }, [filter, dateRange, sensitiveFilterEnabled, loadInitial]);

  useEffect(() => {
    if (!hasActiveFilterConstraint) {
      emptyFilterPrefetchConditionKeyRef.current = "";
      emptyFilterPrefetchPolicyKeyRef.current = "";
      setEmptyFilterPrefetchRemaining(0, "constraint-off");
      return;
    }

    const conditionKey = `${filter}|${dateRange}|${sensitiveFilterEnabled ? "1" : "0"}`;
    const policyKey = `${conditionKey}|score:${filterConstraintScore}|size:${filteredLoadPageSize}|budget:${emptyFilterPrefetchBudget}`;

    const conditionChanged = emptyFilterPrefetchConditionKeyRef.current !== conditionKey;
    if (conditionChanged) {
      emptyFilterPrefetchConditionKeyRef.current = conditionKey;
      emptyFilterPrefetchPolicyKeyRef.current = policyKey;
      setEmptyFilterPrefetchRemaining(emptyFilterPrefetchBudget, "condition-changed");
      return;
    }

    if (emptyFilterPrefetchPolicyKeyRef.current !== policyKey) {
      emptyFilterPrefetchPolicyKeyRef.current = policyKey;
      setEmptyFilterPrefetchRemaining(
        Math.min(emptyFilterPrefetchRemainingRef.current, emptyFilterPrefetchBudget),
        "policy-updated"
      );
    }
  }, [
    filter,
    dateRange,
    sensitiveFilterEnabled,
    filterConstraintScore,
    filteredLoadPageSize,
    hasActiveFilterConstraint,
    emptyFilterPrefetchBudget,
    setEmptyFilterPrefetchRemaining,
  ]);

  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastInitialLoadedAtRef.current < FOCUS_REFRESH_MIN_INTERVAL_MS) {
        return;
      }
      void loadInitial();
    };
    window.addEventListener("focus", handleFocus);
    return () => { window.removeEventListener("focus", handleFocus); };
  }, [loadInitial]);

  return {
    serverTypeCounts,
    hasMore,
    totalCount,
    isLoading,
    isLoadingMore,
    filterConstraintScore,
    filteredLoadPageSize,
    hasActiveFilterConstraint,
    emptyFilterPrefetchBudget,
    emptyFilterPrefetchRemaining: emptyFilterPrefetchRemainingRef.current,
    loadInitial,
    loadMore,
    setEmptyFilterPrefetchRemaining,
  };
}
