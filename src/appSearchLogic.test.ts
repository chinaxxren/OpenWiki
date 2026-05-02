import test from "node:test";
import assert from "node:assert/strict";
import {
  pruneExpiredSearchCache,
  SEARCH_CACHE_LIMIT,
  SEARCH_CACHE_TTL_MS,
  setSearchCacheEntry,
  type SearchCacheEntry,
} from "./appSearchLogic";

function makeEntry(expiresAt: number): SearchCacheEntry {
  return {
    contentResults: [],
    wikiResults: [],
    expiresAt,
  };
}

test("pruneExpiredSearchCache removes only expired entries", () => {
  const cache = new Map<string, SearchCacheEntry>([
    ["expired", makeEntry(99)],
    ["fresh", makeEntry(101)],
  ]);

  pruneExpiredSearchCache(cache, 100);

  assert.equal(cache.has("expired"), false);
  assert.equal(cache.has("fresh"), true);
});

test("setSearchCacheEntry writes entry with ttl", () => {
  const cache = new Map<string, SearchCacheEntry>();
  const nowMs = 1000;

  setSearchCacheEntry(cache, "hello", { contentResults: [], wikiResults: [] }, nowMs);

  assert.equal(cache.get("hello")?.expiresAt, nowMs + SEARCH_CACHE_TTL_MS);
});

test("setSearchCacheEntry touches existing key so it becomes most recent", () => {
  const cache = new Map<string, SearchCacheEntry>();
  setSearchCacheEntry(cache, "a", { contentResults: [], wikiResults: [] }, 1000);
  setSearchCacheEntry(cache, "b", { contentResults: [], wikiResults: [] }, 1000);
  setSearchCacheEntry(cache, "a", { contentResults: [], wikiResults: [] }, 1000);

  assert.deepEqual(Array.from(cache.keys()), ["b", "a"]);
});

test("setSearchCacheEntry evicts oldest key when cache exceeds limit", () => {
  const cache = new Map<string, SearchCacheEntry>();
  for (let i = 0; i < SEARCH_CACHE_LIMIT; i += 1) {
    setSearchCacheEntry(cache, `q-${i}`, { contentResults: [], wikiResults: [] }, 1000);
  }
  setSearchCacheEntry(cache, "overflow", { contentResults: [], wikiResults: [] }, 1000);

  assert.equal(cache.size, SEARCH_CACHE_LIMIT);
  assert.equal(cache.has("q-0"), false);
  assert.equal(cache.has("overflow"), true);
});
