import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type ThemeMode,
} from "../lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);

    function syncTheme() {
      const nextTheme = getStoredTheme();
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    }

    window.addEventListener("storage", syncTheme);
    window.addEventListener("yaobox-theme-change", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("yaobox-theme-change", syncTheme);
    };
  }, [theme]);

  function setTheme(nextTheme: ThemeMode) {
    setStoredTheme(nextTheme);
    setThemeState(nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
  };
}