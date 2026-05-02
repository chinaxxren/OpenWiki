import {
  getDatesWithContent,
  getContentForDate,
  getExportDir,
} from "./dataHubService";
import type { CapturedContent } from "../types/content";

export interface DateEntry {
  date: string;
  count: number;
}

export interface MonthGroup {
  month: string;
  label: string;
  dates: DateEntry[];
  expanded: boolean;
  totalCount: number;
}

export interface DataHubSidebarData {
  monthGroups: MonthGroup[];
  totalDates: number;
  totalItems: number;
}

function groupByMonth(dates: DateEntry[]): MonthGroup[] {
  const map = new Map<string, DateEntry[]>();

  for (const entry of dates) {
    const month = entry.date.slice(0, 7);
    if (!map.has(month)) {
      map.set(month, []);
    }
    map.get(month)!.push(entry);
  }

  const groups: MonthGroup[] = [];
  for (const [month, entries] of map) {
    const [year, m] = month.split("-");
    const monthNum = parseInt(m, 10);
    groups.push({
      month,
      label: `${year}年${monthNum}月`,
      dates: entries.sort((a, b) => b.date.localeCompare(a.date)),
      expanded: false,
      totalCount: entries.reduce((sum, e) => sum + e.count, 0),
    });
  }

  groups.sort((a, b) => b.month.localeCompare(a.month));
  if (groups.length > 0) {
    groups[0].expanded = true;
  }

  return groups;
}

export async function loadDataHubSidebarData(): Promise<DataHubSidebarData> {
  const dates = await getDatesWithContent();
  return {
    monthGroups: groupByMonth(dates),
    totalDates: dates.length,
    totalItems: dates.reduce((sum, d) => sum + d.count, 0),
  };
}

export async function loadDataHubDayContents(date: string): Promise<CapturedContent[]> {
  return getContentForDate(date);
}

export async function loadDataHubExportDir(): Promise<string> {
  return getExportDir();
}
