import type { CapturedContent } from "./types/content";
import type { WikiPage } from "./types/wiki";

export const SEARCH_CACHE_LIMIT = 80;
export const SEARCH_CACHE_TTL_MS = 5 * 60_000;

export interface SearchResultBundle {
  contentResults: CapturedContent[];
  wikiResults: WikiPage[];
}

export interface SearchCacheEntry extends SearchResultBundle {
  expiresAt: number;
}

export function pruneExpiredSearchCache(cache: Map<string, SearchCacheEntry>, nowMs: number) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= nowMs) cache.delete(key);
  }
}

export function setSearchCacheEntry(
  cache: Map<string, SearchCacheEntry>,
  query: string,
  result: SearchResultBundle,
  nowMs: number
) {
  pruneExpiredSearchCache(cache, nowMs);
  const entry: SearchCacheEntry = {
    contentResults: result.contentResults,
    wikiResults: result.wikiResults,
    expiresAt: nowMs + SEARCH_CACHE_TTL_MS,
  };
  if (cache.has(query)) cache.delete(query);
  cache.set(query, entry);
  if (cache.size > SEARCH_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}
