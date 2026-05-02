import type { ReactNode } from "react";

export function SettingRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
        {desc && <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ToggleSwitch({ checked, onChange, color = "orange" }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  const bgColor = checked
    ? color === "amber" ? "bg-amber-500"
    : color === "green" ? "bg-green-500"
    : "bg-orange-500"
    : "bg-gray-300 dark:bg-slate-600";

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${bgColor}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
