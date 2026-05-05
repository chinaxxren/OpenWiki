import type { ContentListDateRange, ContentListFilter } from "../../services/contentListService";
import type { ContentImportKind } from "../../services/storageService";

const FILTERED_LOAD_PAGE_SIZE = 100;
const FILTERED_LOAD_PAGE_SIZE_STEP = 25;
const FILTERED_LOAD_PAGE_SIZE_MAX = 200;
const EMPTY_FILTER_PREFETCH_BASE_BATCHES = 1;
const EMPTY_FILTER_PREFETCH_MAX_BATCHES = 5;

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
