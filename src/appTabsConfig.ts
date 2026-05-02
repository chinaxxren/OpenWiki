import { ClipboardList, Target, Settings, BookOpen, CalendarDays } from "lucide-react";
import type { TabItem } from "./AppTabs";

export const TAB_DEFS: TabItem[] = [
  { id: "content", labelKey: "nav.content", icon: ClipboardList },
  { id: "wiki", labelKey: "nav.wiki", icon: BookOpen },
  { id: "report", labelKey: "nav.report", icon: CalendarDays },
  { id: "digest", labelKey: "nav.digest", icon: Target },
  { id: "settings", labelKey: "nav.settings", icon: Settings },
];
