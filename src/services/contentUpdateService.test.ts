import test from "node:test";
import assert from "node:assert/strict";
import { fetchContentsByIds, hydrateContentDetail } from "./contentUpdateService";
import type { CapturedContent } from "../types/content";

function makeContent(overrides: Partial<CapturedContent> = {}): CapturedContent {
  return {
    id: "content-1",
    content_type: "text",
    raw_text: "hello world",
    raw_text_length: undefined,
    source_app: "Notes",
    captured_at: "2026-05-02T10:00:00+08:00",
    content_hash: "hash-1",
    byte_size: 11,
    is_deleted: false,
    created_at: "2026-05-02T10:00:00+08:00",
    updated_at: "2026-05-02T10:00:00+08:00",
    ...overrides,
  };
}

test("hydrateContentDetail marks detail complete and fills derived fields", () => {
  const hydrated = hydrateContentDetail(makeContent({ clean_content: "clean text" }));
  assert.equal(hydrated.detail_complete, true);
  assert.equal(hydrated.raw_text_length, 11);
  assert.equal(hydrated.has_clean_content, true);
});

test("hydrateContentDetail handles empty raw text and missing clean content", () => {
  const hydrated = hydrateContentDetail(makeContent({ raw_text: undefined, clean_content: undefined }));
  assert.equal(hydrated.detail_complete, true);
  assert.equal(hydrated.raw_text_length, 0);
  assert.equal(hydrated.has_clean_content, false);
});

test("fetchContentsByIds returns empty array for empty ids", async () => {
  const contents = await fetchContentsByIds([]);
  assert.deepEqual(contents, []);
});
