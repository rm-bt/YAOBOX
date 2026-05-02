import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const isLight = theme === "light";
  const isDark = theme === "dark";

  return (
    <div
      className={[
        "inline-flex items-center rounded-full border p-1 shadow-sm",
        isDark
          ? "border-slate-700 bg-slate-900"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={isLight}
        title="Light mode"
        className={[
          "inline-flex items-center gap-2 rounded-full font-bold transition-all",
          compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm",
          isLight
            ? "bg-[#d9e9c6] text-[#2d3a22] shadow-sm"
            : isDark
              ? "text-slate-300 hover:text-white"
              : "text-slate-500 hover:text-slate-900",
        ].join(" ")}
      >
        <Sun className="h-4 w-4" />
        {!compact ? "Light" : null}
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        title="Dark mode"
        className={[
          "inline-flex items-center gap-2 rounded-full font-bold transition-all",
          compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm",
          isDark
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900",
        ].join(" ")}
      >
        <Moon className="h-4 w-4" />
        {!compact ? "Dark" : null}
      </button>
    </div>
  );
}