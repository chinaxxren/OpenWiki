import {
  generateReport,
  getAllReports,
  getReport,
} from "./reportService";
import { getContentForDateRange } from "./storageService";
import type { CapturedContent } from "../types/content";
import type { ReportSummary, WeeklyReport } from "../types/report";

export interface ReportScreenData {
  report: WeeklyReport;
  weekContents: CapturedContent[];
}

export interface InitialReportSelection {
  reportList: ReportSummary[];
  selectedWeekStart: string | null;
}

export interface GeneratedReportData {
  report: WeeklyReport;
  reportList: ReportSummary[];
  weekContents: CapturedContent[];
}

export async function loadInitialReportSelection(currentWeekStart: string | null): Promise<InitialReportSelection> {
  const reportList = await getAllReports();
  if (currentWeekStart) {
    return {
      reportList,
      selectedWeekStart: currentWeekStart,
    };
  }
  return {
    reportList,
    selectedWeekStart: reportList[0]?.week_start ?? null,
  };
}

export async function loadReportScreen(weekStart: string): Promise<ReportScreenData> {
  const report = await getReport(weekStart);
  const weekContents = await getContentForDateRange(report.week_start, report.week_end);
  return {
    report,
    weekContents,
  };
}

export async function generateReportScreen(): Promise<GeneratedReportData> {
  const report = await generateReport();
  const [reportList, weekContents] = await Promise.all([
    getAllReports(),
    getContentForDateRange(report.week_start, report.week_end),
  ]);

  return {
    report,
    reportList,
    weekContents,
  };
}
