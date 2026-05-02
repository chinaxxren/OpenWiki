import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchWiki } from "./services/wikiService";
import {
  pruneExpiredSearchCache,
  type SearchResultBundle,
  setSearchCacheEntry,
  type SearchCacheEntry,
} from "./appSearchLogic";
import type { CapturedContent } from "./types/content";
import type { WikiPage } from "./types/wiki";

const SEARCH_CONTENT_FETCH_LIMIT = 20;
const SEARCH_WIKI_FETCH_LIMIT = 8;
const SEARCH_DROPDOWN_WIKI_LIMIT = 3;
const SEARCH_DROPDOWN_CONTENT_LIMIT = 8;
const EMPTY_CONTENT_RESULTS: CapturedContent[] = [];
const EMPTY_WIKI_RESULTS: WikiPage[] = [];

export function useAppSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CapturedContent[]>(EMPTY_CONTENT_RESULTS);
  const [wikiSearchResults, setWikiSearchResults] = useState<WikiPage[]>(EMPTY_WIKI_RESULTS);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCacheRef = useRef<Map<string, SearchCacheEntry>>(new Map());
  const searchInflightRef = useRef<Map<string, Promise<SearchResultBundle>>>(new Map());
  const searchRequestSeqRef = useRef(0);
  const activeSearchKeyRef = useRef("");
  const pendingSearchKeyRef = useRef("");
  const dataHubServiceRef = useRef<Promise<typeof import("./services/dataHubService")> | null>(null);

  const displayedWikiResults = useMemo(
    () => wikiSearchResults.slice(0, SEARCH_DROPDOWN_WIKI_LIMIT),
    [wikiSearchResults]
  );
  const displayedContentResults = useMemo(
    () => searchResults.slice(0, SEARCH_DROPDOWN_CONTENT_LIMIT),
    [searchResults]
  );
  const hasWikiResults = displayedWikiResults.length > 0;
  const hasContentResults = displayedContentResults.length > 0;

  const applySearchResults = useCallback((contentResults: CapturedContent[], wikiResults: WikiPage[]) => {
    setSearchResults((prev) => (prev === contentResults ? prev : contentResults));
    setWikiSearchResults((prev) => (prev === wikiResults ? prev : wikiResults));
  }, []);

  const clearSearchResults = useCallback(() => {
    setSearchResults((prev) => (prev.length === 0 ? prev : EMPTY_CONTENT_RESULTS));
    setWikiSearchResults((prev) => (prev.length === 0 ? prev : EMPTY_WIKI_RESULTS));
  }, []);

  const resetSearchState = useCallback((clearInput = false) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    searchRequestSeqRef.current += 1;
    activeSearchKeyRef.current = "";
    pendingSearchKeyRef.current = "";
    setSearching((prev) => (prev ? false : prev));
    clearSearchResults();
    if (clearInput) {
      setSearchQuery((prev) => (prev ? "" : prev));
    }
  }, [clearSearchResults]);

  const doSearch = useCallback((query: string) => {
    const normalized = query.trim();

    if (!normalized) {
      resetSearchState(false);
      return;
    }

    const hasPendingSameQuery = normalized === pendingSearchKeyRef.current && (
      searchTimerRef.current !== null ||
      searchInflightRef.current.has(normalized)
    );
    if (hasPendingSameQuery) return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    const nowMs = Date.now();
    pruneExpiredSearchCache(searchCacheRef.current, nowMs);

    const cached = searchCacheRef.current.get(normalized);
    if (cached && cached.expiresAt > nowMs) {
      searchCacheRef.current.delete(normalized);
      searchCacheRef.current.set(normalized, cached);
      applySearchResults(cached.contentResults, cached.wikiResults);
      activeSearchKeyRef.current = normalized;
      pendingSearchKeyRef.current = "";
      setSearching((prev) => (prev ? false : prev));
      return;
    }

    if (
      normalized === activeSearchKeyRef.current &&
      !searchInflightRef.current.has(normalized)
    ) {
      setSearching((prev) => (prev ? false : prev));
      return;
    }

    pendingSearchKeyRef.current = normalized;
    setSearching((prev) => (prev ? prev : true));
    const requestId = ++searchRequestSeqRef.current;

    searchTimerRef.current = setTimeout(async () => {
      searchTimerRef.current = null;
      try {
        let inflight = searchInflightRef.current.get(normalized);
        if (!inflight) {
          if (!dataHubServiceRef.current) {
            dataHubServiceRef.current = import("./services/dataHubService");
          }

          inflight = Promise.all([
            dataHubServiceRef.current.then((m) => m.searchContent(normalized, SEARCH_CONTENT_FETCH_LIMIT)),
            searchWiki(normalized, SEARCH_WIKI_FETCH_LIMIT),
          ]).then(([contentResults, wikiResults]) => ({
            contentResults,
            wikiResults,
          }));

          searchInflightRef.current.set(normalized, inflight);
          inflight.finally(() => {
            searchInflightRef.current.delete(normalized);
          });
        }

        const result = await inflight;
        setSearchCacheEntry(searchCacheRef.current, normalized, result, Date.now());

        if (requestId !== searchRequestSeqRef.current) return;
        applySearchResults(result.contentResults, result.wikiResults);
        activeSearchKeyRef.current = normalized;
      } catch (e) {
        if (requestId !== searchRequestSeqRef.current) return;
        console.error("Search failed:", e);
        clearSearchResults();
      } finally {
        if (requestId === searchRequestSeqRef.current) {
          pendingSearchKeyRef.current = "";
          setSearching(false);
        }
      }
    }, 300);
  }, [resetSearchState, applySearchResults, clearSearchResults]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery((prev) => (prev === value ? prev : value));
    doSearch(value);
  }, [doSearch]);

  const closeAndResetSearch = useCallback((clearInput = true) => {
    setSearchOpen(false);
    resetSearchState(clearInput);
  }, [resetSearchState]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      searchRequestSeqRef.current += 1;
    },
    []
  );

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    searching,
    searchInputRef,
    displayedWikiResults,
    displayedContentResults,
    hasWikiResults,
    hasContentResults,
    handleSearchInputChange,
    resetSearchState,
    closeAndResetSearch,
  };
}
