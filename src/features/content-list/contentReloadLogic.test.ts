import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_RELOAD_BATCH_MAX_IDS,
  filterQueuedReloadIds,
  normalizeReloadId,
  shouldQueueReloadId,
  splitReloadIdsIntoChunks,
} from "./contentReloadLogic";

test("normalizeReloadId trims valid ids and rejects empty input", () => {
  assert.equal(normalizeReloadId(" abc "), "abc");
  assert.equal(normalizeReloadId(""), null);
  assert.equal(normalizeReloadId("   "), null);
});

test("shouldQueueReloadId skips ids outside loaded set when set is non-empty", () => {
  const loaded = new Set(["a", "b"]);
  assert.equal(shouldQueueReloadId(" a ", loaded), "a");
  assert.equal(shouldQueueReloadId("c", loaded), null);
});

test("shouldQueueReloadId allows normalized ids when loaded set is empty", () => {
  assert.equal(shouldQueueReloadId(" abc ", new Set()), "abc");
});

test("filterQueuedReloadIds keeps only loaded ids", () => {
  assert.deepEqual(
    filterQueuedReloadIds(["a", "b", "c"], new Set(["b", "c"])),
    ["b", "c"]
  );
});

test("splitReloadIdsIntoChunks uses the default batch size and preserves order", () => {
  const ids = Array.from({ length: CONTENT_RELOAD_BATCH_MAX_IDS + 5 }, (_, index) => `id-${index}`);
  const chunks = splitReloadIdsIntoChunks(ids);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, CONTENT_RELOAD_BATCH_MAX_IDS);
  assert.equal(chunks[1].length, 5);
  assert.equal(chunks[0][0], "id-0");
  assert.equal(chunks[1][4], `id-${CONTENT_RELOAD_BATCH_MAX_IDS + 4}`);
});
