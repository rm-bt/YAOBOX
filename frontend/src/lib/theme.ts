export const THEME_STORAGE_KEY = "yaobox_theme";

export type ThemeMode = "light" | "dark";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.body.classList.remove("yaobox-theme-light", "yaobox-theme-dark");
  document.body.classList.add(
    theme === "dark" ? "yaobox-theme-dark" : "yaobox-theme-light"
  );

  document.documentElement.classList.remove("dark", "light");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = theme;
}

export function setStoredTheme(theme: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event("yaobox-theme-change"));
}