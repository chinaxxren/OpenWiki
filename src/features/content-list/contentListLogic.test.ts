import test from "node:test";
import assert from "node:assert/strict";
import { formatLocalDateKey } from "../../lib/dateUtils";
import {
  getContentListBucket,
  isImportedDocument,
  matchesContentListDateRange,
  matchesContentListQuery,
  shouldDecrementTotalForDeletedContent,
} from "../../lib/contentListQuery";
import {
  countCommaSeparatedTags,
  getEmptyFilterPrefetchBudget,
  getFilteredLoadPageSize,
  getFilterConstraintScore,
  getImportKind,
} from "./contentListLogic";

test("getFilterConstraintScore counts active constraints", () => {
  assert.equal(getFilterConstraintScore("all", "all", false), 0);
  assert.equal(getFilterConstraintScore("text", "all", false), 1);
  assert.equal(getFilterConstraintScore("text", "week", false), 2);
  assert.equal(getFilterConstraintScore("text", "week", true), 3);
});

test("getFilteredLoadPageSize grows with constraint score and caps at max", () => {
  assert.equal(getFilteredLoadPageSize(0), 50);
  assert.equal(getFilteredLoadPageSize(1), 125);
  assert.equal(getFilteredLoadPageSize(2), 150);
  assert.equal(getFilteredLoadPageSize(4), 200);
  assert.equal(getFilteredLoadPageSize(10), 200);
});

test("getEmptyFilterPrefetchBudget respects active state and cap", () => {
  assert.equal(getEmptyFilterPrefetchBudget(false, 0), 0);
  assert.equal(getEmptyFilterPrefetchBudget(true, 0), 1);
  assert.equal(getEmptyFilterPrefetchBudget(true, 2), 3);
  assert.equal(getEmptyFilterPrefetchBudget(true, 10), 5);
});

test("getImportKind detects markdown, text, image and document imports", () => {
  assert.equal(getImportKind({ name: "note.md", type: "text/markdown" }), "markdown");
  assert.equal(getImportKind({ name: "note.txt", type: "text/plain" }), "text");
  assert.equal(getImportKind({ name: "scan.PNG", type: "" }), "image");
  assert.equal(getImportKind({ name: "report.pdf", type: "application/pdf" }), "document");
  assert.equal(getImportKind({ name: "archive.zip", type: "application/zip" }), null);
});

test("countCommaSeparatedTags ignores empty and whitespace-only segments", () => {
  assert.equal(countCommaSeparatedTags(""), 0);
  assert.equal(countCommaSeparatedTags("alpha"), 1);
  assert.equal(countCommaSeparatedTags("alpha, beta, gamma"), 3);
  assert.equal(countCommaSeparatedTags("alpha, , beta,,   ,gamma"), 3);
  assert.equal(countCommaSeparatedTags(" alpha ,\n beta\t,\r\n gamma "), 3);
});

test("isImportedDocument and getContentListBucket classify imported documents", () => {
  assert.equal(isImportedDocument({ source_app: "Markdown 导入" }), true);
  assert.equal(isImportedDocument({ source_app: "导入内容" }), true);
  assert.equal(isImportedDocument({ source_app: "Safari" }), false);
  assert.equal(getContentListBucket({ content_type: "text", source_app: "Markdown 导入" }), "document");
  assert.equal(getContentListBucket({ content_type: "url", source_app: "Safari" }), "url");
});

test("matchesContentListDateRange checks today, week and half-month windows", () => {
  const now = new Date("2026-05-02T12:00:00+08:00");
  assert.equal(matchesContentListDateRange("2026-05-02T08:00:00+08:00", "all", now), true);
  assert.equal(matchesContentListDateRange("2026-05-02T08:00:00+08:00", "today", now), true);
  assert.equal(matchesContentListDateRange("2026-05-01T08:00:00+08:00", "today", now), false);
  assert.equal(matchesContentListDateRange("2026-04-26T08:00:00+08:00", "week", now), true);
  assert.equal(matchesContentListDateRange("2026-04-24T08:00:00+08:00", "week", now), false);
  assert.equal(matchesContentListDateRange("2026-04-18T08:00:00+08:00", "half-month", now), true);
  assert.equal(matchesContentListDateRange("2026-04-16T08:00:00+08:00", "half-month", now), false);
});

test("matchesContentListQuery applies filter, date range and sensitive filtering", () => {
  const todayCapturedAt = `${formatLocalDateKey(new Date())}T08:00:00+08:00`;
  const content = {
    content_type: "text" as const,
    source_app: "Markdown 导入",
    captured_at: todayCapturedAt,
    raw_text: "ordinary note",
  };
  assert.equal(matchesContentListQuery(content, "document", "today", false), true);
  assert.equal(matchesContentListQuery(content, "text", "today", false), false);
  assert.equal(matchesContentListQuery(content, "document", "week", true), true);
  assert.equal(
    matchesContentListQuery(
      { ...content, raw_text: "api_key=sk-123456789012345678901234" },
      "document",
      "today",
      true
    ),
    false
  );
});

test("shouldDecrementTotalForDeletedContent only decrements when deleted content matches active query", () => {
  const todayCapturedAt = `${formatLocalDateKey(new Date())}T08:00:00+08:00`;
  const content = {
    content_type: "url" as const,
    source_app: "Safari",
    captured_at: todayCapturedAt,
    raw_text: "https://example.com",
  };

  assert.equal(
    shouldDecrementTotalForDeletedContent(content, "url", "today", false),
    true
  );
  assert.equal(
    shouldDecrementTotalForDeletedContent(content, "text", "today", false),
    false
  );
  assert.equal(
    shouldDecrementTotalForDeletedContent(content, "url", "today", true),
    true
  );
  assert.equal(
    shouldDecrementTotalForDeletedContent(
      { ...content, raw_text: "api_key=sk-123456789012345678901234" },
      "url",
      "today",
      true
    ),
    false
  );
});
