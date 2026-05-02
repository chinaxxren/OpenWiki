import type { TFunction } from "i18next";
import type { McpTargetId, McpTargetState } from "../../stores/mcpConnectionStore";

interface ConnectionSectionProps {
  mcpTargets: Record<McpTargetId, McpTargetState>;
  summaryCopied: boolean;
  mcpGlobalError: string | null;
  connectMcpTarget: (target: McpTargetId) => Promise<void>;
  disconnectMcpTarget: (target: McpTargetId, disconnectedMessage: string) => Promise<void>;
  copyContentSummary: () => Promise<void>;
  t: TFunction<"settings">;
}

export function ConnectionSection({
  mcpTargets,
  summaryCopied,
  mcpGlobalError,
  connectMcpTarget,
  disconnectMcpTarget,
  copyContentSummary,
  t,
}: ConnectionSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t("connection.title")}</h2>
      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        {([
          { id: "claude" as McpTargetId, name: "Claude Desktop" },
        ]).map((tgt) => {
          const s = mcpTargets[tgt.id];
          return (
            <div key={tgt.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {tgt.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {s.connected
                      ? t("connection.connectedHint", { name: tgt.name })
                      : t("connection.disconnectedHint", { name: tgt.name })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.connected ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {s.connected ? t("connection.connected") : t("connection.disconnected")}
                  </span>
                </div>
              </div>

              {s.connected ? (
                <button
                  onClick={() => { void disconnectMcpTarget(tgt.id, t("connection.disconnectedMsg")); }}
                  disabled={s.loading}
                  className="w-full py-2 text-sm font-medium rounded-lg border text-red-500 dark:text-red-400 border-red-200/50 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.06] hover:bg-red-100/50 dark:hover:bg-red-500/[0.12] disabled:opacity-50 transition-colors"
                >
                  {s.loading ? t("connection.disconnecting") : t("connection.disconnectBtn")}
                </button>
              ) : (
                <button
                  onClick={() => { void connectMcpTarget(tgt.id); }}
                  disabled={s.loading}
                  className="w-full py-2 text-sm font-medium rounded-lg border text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/[0.06] hover:bg-orange-100/50 dark:hover:bg-orange-500/[0.12] disabled:opacity-50 transition-colors"
                >
                  {s.loading ? t("connection.connecting") : t("connection.connectBtn", { name: tgt.name })}
                </button>
              )}

              {s.message && <p className="mt-2 text-xs text-green-600 dark:text-green-400">{s.message}</p>}
              {s.error && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{s.error}</p>}
            </div>
          );
        })}

        <div className="p-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("connection.summaryTitle")}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
            {t("connection.summaryDesc")}
          </div>
          <button
            onClick={() => { void copyContentSummary(); }}
            className="w-full py-2 text-sm font-medium rounded-lg border text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.04] hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors"
          >
            {summaryCopied ? t("connection.summaryCopied") : t("connection.summaryCopyBtn")}
          </button>
          {mcpGlobalError && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{mcpGlobalError}</p>}
        </div>
      </div>
    </div>
  );
}
