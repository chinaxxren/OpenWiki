import test from "node:test";
import assert from "node:assert/strict";
import {
  filterWeekContentsByMode,
  formatCurrentWeekRange,
  formatReportDateRange,
  mapSelectedSectionContentItems,
  rankSectionsByRelevance,
  selectSectionById,
} from "./reportViewLogic";
import type { CapturedContent } from "../../types/content";
import type { ReportSection } from "../../types/report";

const makeSection = (id: string, relevance: number | null, contentIds: string[] = []): ReportSection => ({
  id,
  report_id: "r1",
  section_type: "highlight",
  title: id,
  body: `${id}-body`,
  relevance_score: relevance,
  sort_order: 0,
  content_ids: contentIds,
});

const makeContent = (id: string, contentType: CapturedContent["content_type"]): CapturedContent => ({
  id,
  content_type: contentType,
  source_app: "Test",
  captured_at: "2026-01-01T00:00:00Z",
  content_hash: `hash-${id}`,
  byte_size: 1,
  is_deleted: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

test("rankSectionsByRelevance sorts descending and treats null as 0", () => {
  const ranked = rankSectionsByRelevance([
    makeSection("a", 0.1),
    makeSection("b", null),
    makeSection("c", 0.9),
  ]);
  assert.deepEqual(ranked.map((section) => section.id), ["c", "a", "b"]);
});

test("filterWeekContentsByMode returns empty for all and filters by content type otherwise", () => {
  const contents = [
    makeContent("t1", "text"),
    makeContent("i1", "image"),
    makeContent("u1", "url"),
  ];
  assert.deepEqual(filterWeekContentsByMode(contents, "all"), []);
  assert.deepEqual(filterWeekContentsByMode(contents, "image").map((item) => item.id), ["i1"]);
});

test("selectSectionById returns matching section or null", () => {
  const sections = [makeSection("a", 0.1), makeSection("b", 0.2)];
  assert.equal(selectSectionById(sections, "b")?.id, "b");
  assert.equal(selectSectionById(sections, null), null);
  assert.equal(selectSectionById(sections, "missing"), null);
});

test("mapSelectedSectionContentItems returns only contents referenced by selected section", () => {
  const selected = makeSection("section-1", 0.8, ["a", "c"]);
  const contents = [
    makeContent("a", "text"),
    makeContent("b", "image"),
    makeContent("c", "url"),
  ];
  assert.deepEqual(
    mapSelectedSectionContentItems(selected, contents).map((item) => item.id),
    ["a", "c"]
  );
  assert.deepEqual(mapSelectedSectionContentItems(null, contents), []);
});

test("formatReportDateRange formats the explicit report range", () => {
  assert.equal(
    formatReportDateRange("2026-05-05", "2026-05-11"),
    "2026.5.05 - 5.11"
  );
});

test("formatCurrentWeekRange computes monday-to-sunday range", () => {
  const now = new Date("2026-05-06T12:00:00Z");
  assert.equal(formatCurrentWeekRange(now), "2026.5.04 - 2026.5.10");
});
