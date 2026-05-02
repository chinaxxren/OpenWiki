import test from "node:test";
import assert from "node:assert/strict";
import {
  loadEntityBackedContents,
  syncEntityBackedContents,
} from "./entityBackedContentService";
import { useContentEntitiesStore } from "../stores/contentEntitiesStore";
import type { CapturedContent } from "../types/content";

function makeContent(id: string, overrides: Partial<CapturedContent> = {}): CapturedContent {
  return {
    id,
    content_type: "text",
    raw_text: `text-${id}`,
    source_app: "Notes",
    captured_at: "2026-05-02T10:00:00+08:00",
    content_hash: `hash-${id}`,
    byte_size: id.length,
    is_deleted: false,
    created_at: "2026-05-02T10:00:00+08:00",
    updated_at: "2026-05-02T10:00:00+08:00",
    ...overrides,
  };
}

test("syncEntityBackedContents writes entities and returns ordered ids", () => {
  useContentEntitiesStore.setState({ entities: {} });
  const ids = syncEntityBackedContents([makeContent("a"), makeContent("b")]);
  assert.deepEqual(ids, ["a", "b"]);
  const entities = useContentEntitiesStore.getState().entities;
  assert.equal(entities.a?.id, "a");
  assert.equal(entities.b?.id, "b");
});

test("loadEntityBackedContents syncs selected contents and preserves outer result", async () => {
  useContentEntitiesStore.setState({ entities: {} });
  const result = await loadEntityBackedContents({
    load: async () => ({
      items: [makeContent("c"), makeContent("d")],
      remaining: 2,
    }),
    selectContents: (value) => value.items,
  });

  assert.deepEqual(result.contentIds, ["c", "d"]);
  assert.equal(result.result.remaining, 2);
  const entities = useContentEntitiesStore.getState().entities;
  assert.equal(entities.c?.id, "c");
  assert.equal(entities.d?.id, "d");
});
