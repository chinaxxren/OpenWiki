const ACCENT = "#F97316";

export function formatRadarDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sourceGradient(color: string): string {
  switch (color) {
    case "wechat": return "linear-gradient(90deg, #15803D, #22C55E)";
    case "chrome": return "linear-gradient(90deg, #1D4ED8, #3B82F6)";
    case "xiaoyun": return `linear-gradient(90deg, #EA580C, ${ACCENT})`;
    default: return "linear-gradient(90deg, #78716C, #A8A29E)";
  }
}

export function formatHeatDate(date: string): string {
  const parts = date.split("-");
  if (parts.length === 3) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  return date;
}

export function parsePercent(label: string): number {
  const m = label.match(/(\d+)/);
  return m ? parseInt(m[1]) : 50;
}
