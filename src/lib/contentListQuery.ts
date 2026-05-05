import type { ContentListDateRange, ContentListFilter } from "../services/contentListService";
import { containsSensitiveData } from "./sensitiveContent";
import { formatLocalDateKey } from "./dateUtils";
import type { CapturedContent, ContentType } from "../types/content";

const IMPORT_SOURCE_APPS = new Set(["Markdown 导入", "导入内容"]);

export function isImportedDocument(content: { source_app: string }): boolean {
  return IMPORT_SOURCE_APPS.has(content.source_app);
}

export function getContentListBucket(content: {
  content_type: ContentType;
  source_app: string;
}): ContentListFilter {
  return isImportedDocument(content) ? "document" : content.content_type;
}

export function matchesContentListDateRange(
  capturedAt: string,
  dateRange: ContentListDateRange,
  now = new Date(),
): boolean {
  if (dateRange === "all") return true;
  const capturedDateKey = capturedAt.slice(0, 10);
  if (capturedDateKey.length !== 10) return false;

  const endKey = formatLocalDateKey(now);
  if (dateRange === "today") {
    return capturedDateKey === endKey;
  }

  const start = new Date(now);
  start.setDate(now.getDate() - (dateRange === "week" ? 7 : 15));
  const startKey = formatLocalDateKey(start);
  return capturedDateKey >= startKey && capturedDateKey <= endKey;
}

export function matchesContentListQuery(
  content: Pick<CapturedContent, "content_type" | "source_app" | "captured_at" | "raw_text">,
  filter: ContentListFilter,
  dateRange: ContentListDateRange,
  sensitiveFilterEnabled: boolean,
): boolean {
  if (filter !== "all" && getContentListBucket(content) !== filter) {
    return false;
  }

  if (!matchesContentListDateRange(content.captured_at, dateRange)) {
    return false;
  }

  if (sensitiveFilterEnabled && content.raw_text && containsSensitiveData(content.raw_text)) {
    return false;
  }

  return true;
}

export function shouldDecrementTotalForDeletedContent(
  content: Pick<CapturedContent, "content_type" | "source_app" | "captured_at" | "raw_text">,
  filter: ContentListFilter,
  dateRange: ContentListDateRange,
  sensitiveFilterEnabled: boolean,
): boolean {
  return matchesContentListQuery(content, filter, dateRange, sensitiveFilterEnabled);
}
