import { useState, useRef, useEffect, useCallback } from "react";
import { compileContentToWiki, getContentWikiPages } from "../../services/wikiService";
import type { WikiPage } from "../../types/wiki";

interface LinkedWikiPagesCacheEntry {
  pages: WikiPage[];
  expiresAt: number;
}

const linkedWikiPagesCache = new Map<string, LinkedWikiPagesCacheEntry>();
const linkedWikiPagesInflight = new Map<string, Promise<WikiPage[]>>();
const LINKED_WIKI_CACHE_LIMIT = 500;
const LINKED_WIKI_CACHE_TTL_MS = 5 * 60_000;
const EMPTY_LINKED_WIKI_PAGES: WikiPage[] = [];

function pruneExpiredLinkedWikiPagesCache(nowMs: number) {
  for (const [key, entry] of linkedWikiPagesCache) {
    if (entry.expiresAt <= nowMs) linkedWikiPagesCache.delete(key);
  }
}

function getCachedLinkedWikiPages(id: string, nowMs = Date.now()): WikiPage[] | null {
  const cached = linkedWikiPagesCache.get(id);
  if (!cached) return null;
  if (cached.expiresAt <= nowMs) {
    linkedWikiPagesCache.delete(id);
    return null;
  }
  return cached.pages;
}

function setLinkedWikiPagesCache(id: string, pages: WikiPage[]) {
  const nowMs = Date.now();
  pruneExpiredLinkedWikiPagesCache(nowMs);
  if (linkedWikiPagesCache.has(id)) {
    linkedWikiPagesCache.delete(id);
  }
  linkedWikiPagesCache.set(id, {
    pages,
    expiresAt: nowMs + LINKED_WIKI_CACHE_TTL_MS,
  });
  if (linkedWikiPagesCache.size > LINKED_WIKI_CACHE_LIMIT) {
    const oldestKey = linkedWikiPagesCache.keys().next().value;
    if (oldestKey) linkedWikiPagesCache.delete(oldestKey);
  }
}

interface UseLinkedWikiPagesResult {
  linkedWikiPages: WikiPage[];
  wikiState: "idle" | "compiling" | "done";
  handleWikiCompile: () => Promise<void>;
}

export function useLinkedWikiPages(contentId: string, wikiCompileHash?: string): UseLinkedWikiPagesResult {
  const [loadedLinkedWikiPages, setLoadedLinkedWikiPages] = useState<{
    contentId: string;
    pages: WikiPage[];
  }>(() => ({
    contentId,
    pages: getCachedLinkedWikiPages(contentId) ?? EMPTY_LINKED_WIKI_PAGES,
  }));
  const [wikiState, setWikiState] = useState<"idle" | "compiling" | "done">("idle");
  const wikiStateResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkedWikiPages = loadedLinkedWikiPages.contentId === contentId
    ? loadedLinkedWikiPages.pages
    : (getCachedLinkedWikiPages(contentId) ?? EMPTY_LINKED_WIKI_PAGES);

  useEffect(() => {
    let cancelled = false;

    if (!wikiCompileHash) return;
    const cached = getCachedLinkedWikiPages(contentId);
    if (cached) return;

    let inflight = linkedWikiPagesInflight.get(contentId);
    if (!inflight) {
      inflight = getContentWikiPages(contentId)
        .then((pages) => {
          setLinkedWikiPagesCache(contentId, pages);
          return pages;
        })
        .finally(() => {
          linkedWikiPagesInflight.delete(contentId);
        });
      linkedWikiPagesInflight.set(contentId, inflight);
    }

    inflight
      .then((pages) => {
        if (!cancelled) {
          setLoadedLinkedWikiPages({ contentId, pages });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedLinkedWikiPages({ contentId, pages: EMPTY_LINKED_WIKI_PAGES });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentId, wikiCompileHash]);

  useEffect(
    () => () => {
      if (wikiStateResetTimerRef.current) window.clearTimeout(wikiStateResetTimerRef.current);
    },
    []
  );

  const handleWikiCompile = useCallback(async () => {
    if (wikiState === "compiling") return;
    setWikiState("compiling");
    try {
      await compileContentToWiki(contentId);
      setWikiState("done");
      const pages = await getContentWikiPages(contentId);
      setLinkedWikiPagesCache(contentId, pages);
      setLoadedLinkedWikiPages({ contentId, pages });
      if (wikiStateResetTimerRef.current) {
        window.clearTimeout(wikiStateResetTimerRef.current);
      }
      wikiStateResetTimerRef.current = window.setTimeout(() => setWikiState("idle"), 2000);
    } catch (e) {
      console.error("Wiki compile failed:", e);
      setWikiState("idle");
    }
  }, [contentId, wikiState]);

  return {
    linkedWikiPages,
    wikiState,
    handleWikiCompile,
  };
}
