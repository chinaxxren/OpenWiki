import {
  getFilteredContentListPageWithInfo,
  type ContentListCounts,
} from "./storageService";
import type { CapturedContent } from "../types/content";

export type ContentListFilter = "all" | "text" | "image" | "url" | "mixed" | "document";
export type ContentListDateRange = "all" | "today" | "week" | "half-month";

export interface ContentListQuery {
  filter: ContentListFilter;
  dateRange: ContentListDateRange;
  excludeSensitive: boolean;
  limit: number;
  offset: number;
}

export interface ContentListPageResult {
  contents: CapturedContent[];
  matchingItems: number;
  diskUsageMb: number;
  counts: ContentListCounts;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateRangeParams(dateRange: ContentListDateRange): { dateFrom: string | null; dateTo: string | null } {
  if (dateRange === "all") {
    return { dateFrom: null, dateTo: null };
  }

  const end = new Date();
  const start = new Date(end);
  if (dateRange === "today") {
    return {
      dateFrom: formatLocalDateKey(start),
      dateTo: formatLocalDateKey(end),
    };
  }

  if (dateRange === "week") {
    start.setDate(end.getDate() - 7);
  } else {
    start.setDate(end.getDate() - 15);
  }

  return {
    dateFrom: formatLocalDateKey(start),
    dateTo: formatLocalDateKey(end),
  };
}

export async function fetchContentListPage(query: ContentListQuery): Promise<ContentListPageResult> {
  const { dateFrom, dateTo } = buildDateRangeParams(query.dateRange);
  const result = await getFilteredContentListPageWithInfo({
    contentFilter: query.filter,
    dateFrom,
    dateTo,
    excludeSensitive: query.excludeSensitive,
    limit: query.limit,
    offset: query.offset,
  });

  return {
    contents: result.contents,
    matchingItems: result.matching_items,
    diskUsageMb: result.disk_usage_mb,
    counts: result.counts,
  };
}
