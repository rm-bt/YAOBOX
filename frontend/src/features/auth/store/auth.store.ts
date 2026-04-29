import { create } from "zustand";

const TOKEN_STORAGE_KEY = "yaobox_access_token";

type AuthState = {
  token: string | null;
  setToken: (token: string) => void;
  clearSession: () => void;
};

function normalizeToken(token: unknown): string | null {
  if (typeof token !== "string") {
    return null;
  }

  const cleaned = token.trim();

  if (!cleaned || cleaned === "undefined" || cleaned === "null") {
    return null;
  }

  return cleaned;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),

  setToken: (token) => {
    const normalized = normalizeToken(token);

    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }

    set({ token: normalized });
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    set({ token: null });
  },
}));