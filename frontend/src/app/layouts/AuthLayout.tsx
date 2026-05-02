import { Outlet } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";

export function AuthLayout() {
  useTheme();

  return (
    <div className="relative min-h-screen">
      <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2">
        <ThemeToggle compact />
      </div>

      <Outlet />
    </div>
  );
}