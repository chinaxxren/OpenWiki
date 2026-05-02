import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface AuthState {
  oauthLoggedIn: boolean;
  oauthEmail: string;
  oauthLoading: boolean;
  geminiOauthLoggedIn: boolean;
  geminiOauthEmail: string;
  geminiOauthLoading: boolean;
  loadOAuthStatus: () => Promise<void>;
  startOAuthLogin: () => Promise<void>;
  logoutOAuth: () => Promise<void>;
  loadGeminiOAuthStatus: () => Promise<void>;
  startGeminiOAuthLogin: () => Promise<void>;
  logoutGeminiOAuth: () => Promise<void>;
  loadAllAuthStatuses: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  oauthLoggedIn: false,
  oauthEmail: "",
  oauthLoading: false,
  geminiOauthLoggedIn: false,
  geminiOauthEmail: "",
  geminiOauthLoading: false,

  loadOAuthStatus: async () => {
    try {
      const status = await invoke<{ logged_in: boolean; email?: string }>("get_openai_oauth_status");
      set({ oauthLoggedIn: status.logged_in, oauthEmail: status.email || "" });
    } catch {
      set({ oauthLoggedIn: false, oauthEmail: "" });
    }
  },

  startOAuthLogin: async () => {
    set({ oauthLoading: true });
    try {
      const status = await invoke<{ logged_in: boolean; email?: string }>("start_openai_oauth");
      set({ oauthLoggedIn: status.logged_in, oauthEmail: status.email || "", oauthLoading: false });
    } catch (e) {
      set({ oauthLoading: false });
      throw e;
    }
  },

  logoutOAuth: async () => {
    try {
      await invoke("logout_openai_oauth");
      set({ oauthLoggedIn: false, oauthEmail: "" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
  },

  loadGeminiOAuthStatus: async () => {
    try {
      const status = await invoke<{ logged_in: boolean; email?: string }>("get_gemini_oauth_status");
      set({ geminiOauthLoggedIn: status.logged_in, geminiOauthEmail: status.email || "" });
    } catch {
      set({ geminiOauthLoggedIn: false, geminiOauthEmail: "" });
    }
  },

  startGeminiOAuthLogin: async () => {
    set({ geminiOauthLoading: true });
    try {
      const status = await invoke<{ logged_in: boolean; email?: string }>("start_gemini_oauth");
      set({ geminiOauthLoggedIn: status.logged_in, geminiOauthEmail: status.email || "", geminiOauthLoading: false });
    } catch (e) {
      set({ geminiOauthLoading: false });
      throw e;
    }
  },

  logoutGeminiOAuth: async () => {
    try {
      await invoke("logout_gemini_oauth");
      set({ geminiOauthLoggedIn: false, geminiOauthEmail: "" });
    } catch (e) {
      console.error("Gemini logout failed:", e);
    }
  },

  loadAllAuthStatuses: async () => {
    await Promise.all([
      get().loadOAuthStatus(),
      get().loadGeminiOAuthStatus(),
    ]);
  },
}));
