import type { CapturedContent } from "../../types/content";
import type { ReportSection } from "../../types/report";

export type ReportFilterMode = "all" | "text" | "url" | "image";

export function rankSectionsByRelevance(sections: ReportSection[]): ReportSection[] {
  return [...sections].sort(
    (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
  );
}

export function filterWeekContentsByMode(
  weekContents: CapturedContent[],
  filterMode: ReportFilterMode
): CapturedContent[] {
  if (filterMode === "all") return [];
  return weekContents.filter((content) => content.content_type === filterMode);
}

export function selectSectionById(
  sections: ReportSection[],
  selectedSectionId: string | null
): ReportSection | null {
  if (!selectedSectionId) return null;
  return sections.find((section) => section.id === selectedSectionId) ?? null;
}

export function mapSelectedSectionContentItems(
  selectedSection: ReportSection | null,
  weekContents: CapturedContent[]
): CapturedContent[] {
  if (!selectedSection) return [];
  const idSet = new Set(selectedSection.content_ids);
  return weekContents.filter((content) => idSet.has(content.id));
}

export function formatReportDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  return `${s.getFullYear()}.${fmt(s)} - ${fmt(e)}`;
}

export function formatCurrentWeekRange(now = new Date()): string {
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}.${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(mon)} - ${fmt(sun)}`;
}
