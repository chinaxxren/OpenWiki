import type { ContentListDateRange, ContentListFilter } from "../../services/contentListService";
import type { ContentImportKind } from "../../services/storageService";
import { containsSensitiveData } from "../../lib/sensitiveContent";
import type { CapturedContent, ContentType } from "../../types/content";

const FILTERED_LOAD_PAGE_SIZE = 100;
const FILTERED_LOAD_PAGE_SIZE_STEP = 25;
const FILTERED_LOAD_PAGE_SIZE_MAX = 200;
const EMPTY_FILTER_PREFETCH_BASE_BATCHES = 1;
const EMPTY_FILTER_PREFETCH_MAX_BATCHES = 5;
const IMPORT_SOURCE_APPS = new Set(["Markdown 导入", "导入内容"]);

export function getFilterConstraintScore(
  filter: ContentListFilter,
  dateRange: ContentListDateRange,
  sensitiveFilterEnabled: boolean
): number {
  let score = 0;
  if (filter !== "all") score += 1;
  if (dateRange !== "all") score += 1;
  if (sensitiveFilterEnabled) score += 1;
  return score;
}

export function getFilteredLoadPageSize(filterConstraintScore: number): number {
  if (filterConstraintScore <= 0) return 50;
  const size = FILTERED_LOAD_PAGE_SIZE + (filterConstraintScore * FILTERED_LOAD_PAGE_SIZE_STEP);
  return Math.min(FILTERED_LOAD_PAGE_SIZE_MAX, size);
}

export function getEmptyFilterPrefetchBudget(hasActiveFilterConstraint: boolean, filterConstraintScore: number): number {
  if (!hasActiveFilterConstraint) return 0;
  const budget = EMPTY_FILTER_PREFETCH_BASE_BATCHES + filterConstraintScore;
  return Math.max(1, Math.min(EMPTY_FILTER_PREFETCH_MAX_BATCHES, budget));
}

export function getImportKind(file: Pick<File, "name" | "type">): ContentImportKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (name.endsWith(".txt")) return "text";
  if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".pptx")) return "document";
  if (
    file.type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  ) {
    return "image";
  }
  return null;
}

export function countCommaSeparatedTags(tags: string): number {
  let count = 0;
  let tokenHasNonWhitespace = false;

  for (let i = 0; i < tags.length; i += 1) {
    const code = tags.charCodeAt(i);
    if (code === 44) {
      if (tokenHasNonWhitespace) count += 1;
      tokenHasNonWhitespace = false;
      continue;
    }
    if (code === 9 || code === 10 || code === 11 || code === 12 || code === 13 || code === 32) {
      continue;
    }
    tokenHasNonWhitespace = true;
  }

  if (tokenHasNonWhitespace) count += 1;
  return count;
}

export function isImportedDocument(content: { source_app: string }): boolean {
  return IMPORT_SOURCE_APPS.has(content.source_app);
}

export function getContentListBucket(content: {
  content_type: ContentType;
  source_app: string;
}): ContentListFilter {
  return isImportedDocument(content) ? "document" : content.content_type;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
