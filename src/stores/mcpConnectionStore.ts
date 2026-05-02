import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type McpTargetId = "claude" | "openclaw";

export interface McpTargetState {
  connected: boolean;
  loading: boolean;
  message: string | null;
  error: string | null;
}

interface McpConnectionState {
  targets: Record<McpTargetId, McpTargetState>;
  summaryCopied: boolean;
  globalError: string | null;
  loadStatus: () => Promise<void>;
  connectTarget: (target: McpTargetId) => Promise<void>;
  disconnectTarget: (target: McpTargetId, disconnectedMessage: string) => Promise<void>;
  copyContentSummary: () => Promise<void>;
  clearGlobalError: () => void;
}

const INITIAL_TARGET_STATE: McpTargetState = {
  connected: false,
  loading: false,
  message: null,
  error: null,
};

function updateTargetState(
  state: McpConnectionState["targets"],
  id: McpTargetId,
  update: Partial<McpTargetState>
): Record<McpTargetId, McpTargetState> {
  return {
    ...state,
    [id]: {
      ...state[id],
      ...update,
    },
  };
}

export const useMcpConnectionStore = create<McpConnectionState>((set, get) => ({
  targets: {
    claude: { ...INITIAL_TARGET_STATE },
    openclaw: { ...INITIAL_TARGET_STATE },
  },
  summaryCopied: false,
  globalError: null,

  loadStatus: async () => {
    for (const target of ["claude", "openclaw"] as McpTargetId[]) {
      try {
        const status = await invoke<{ connected: boolean }>("get_mcp_status", { target });
        set((state) => ({
          targets: updateTargetState(state.targets, target, {
            connected: status.connected,
          }),
        }));
      } catch {
        // Target may not be installed; keep default disconnected state.
      }
    }
  },

  connectTarget: async (target) => {
    set((state) => ({
      targets: updateTargetState(state.targets, target, {
        loading: true,
        error: null,
        message: null,
      }),
    }));
    try {
      const msg = await invoke<string>("connect_mcp", { target });
      set((state) => ({
        targets: updateTargetState(state.targets, target, {
          loading: false,
          message: msg,
          connected: true,
        }),
      }));
    } catch (e) {
      const errMsg = typeof e === "string" ? e : String(e);
      console.error("[MCP] connect error:", errMsg);
      set((state) => ({
        targets: updateTargetState(state.targets, target, {
          loading: false,
          error: errMsg,
        }),
      }));
    }
  },

  disconnectTarget: async (target, disconnectedMessage) => {
    set((state) => ({
      targets: updateTargetState(state.targets, target, {
        loading: true,
        error: null,
        message: null,
      }),
    }));
    try {
      await invoke("disconnect_mcp", { target });
      set((state) => ({
        targets: updateTargetState(state.targets, target, {
          loading: false,
          connected: false,
          message: disconnectedMessage,
        }),
      }));
    } catch (e) {
      set((state) => ({
        targets: updateTargetState(state.targets, target, {
          loading: false,
          error: typeof e === "string" ? e : String(e),
        }),
      }));
    }
  },

  copyContentSummary: async () => {
    try {
      await invoke("copy_content_summary");
      set({ summaryCopied: true, globalError: null });
      window.setTimeout(() => {
        if (get().summaryCopied) {
          set({ summaryCopied: false });
        }
      }, 3000);
    } catch (e) {
      set({ globalError: typeof e === "string" ? e : String(e) });
    }
  },

  clearGlobalError: () => set({ globalError: null }),
}));
