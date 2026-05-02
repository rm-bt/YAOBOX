import { useEffect } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  Pill,
  Plus,
  ScanLine,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "../../features/auth/store/auth.store";
import { useAvatar } from "../../hooks/useAvatar";
import { useTheme } from "../../hooks/useTheme";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
  { to: "/reminders", label: "Reminders", icon: Clock3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: UserRound },
];

function navClass(isActive: boolean) {
  return [
    "flex items-center gap-4 rounded-full px-5 py-4 text-[15px] font-semibold transition-all",
    isActive
      ? "bg-[#d9e9c6] text-[#2d3a22] shadow-sm"
      : "text-[#46536a] hover:bg-[#eef3e4] hover:text-[#1b2437]",
  ].join(" ");
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearSession = useAuthStore((state) => state.clearSession);
  const { avatar } = useAvatar();
  const { theme } = useTheme();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className={[
        "yaobox-app-shell min-h-screen text-[#0f1c3f]",
        theme === "dark" ? "bg-[#020617]" : "bg-[#f6f8f4]",
      ].join(" ")}
    >
      <div className="flex min-h-screen">
        <aside className="app-shell-sidebar hidden lg:flex w-[304px] shrink-0 flex-col border-r border-[#e7ebdf] bg-white/40 px-5 py-6">
          <Link to="/dashboard" className="flex items-center gap-4 px-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d9e9c6] text-[#4b5a3e]">
              <Pill className="h-7 w-7 -rotate-45" strokeWidth={2.4} />
            </div>

            <div className="leading-tight">
              <div className="text-[21px] font-bold tracking-tight text-[#13224a]">
                Yaobox
              </div>
              <div className="text-[14px] text-[#66728a]">
                Clinical Wellness
              </div>
            </div>
          </Link>

          <nav className="mt-10 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => navClass(isActive)}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <Link
              to="/scan"
              className="flex items-center justify-center gap-3 rounded-full bg-[#6b625d] px-6 py-5 text-lg font-bold text-white shadow-[0_18px_40px_-18px_rgba(107,98,93,0.55)] transition-all hover:brightness-95"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
              <span>Add Medicine</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-full border border-[#e4e7de] bg-white px-6 py-4 text-[15px] font-semibold text-[#46536a] transition-all hover:bg-[#f3f5ef]"
            >
              <LogOut className="h-5 w-5" strokeWidth={2.2} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="app-shell-header sticky top-0 z-30 border-b border-[#e7ebdf] bg-[#f6f8f4]/95 backdrop-blur">
            <div className="flex items-center gap-4 px-5 py-5 lg:px-8">
              <div className="app-shell-search hidden md:flex h-14 w-full max-w-[440px] items-center gap-3 rounded-full border border-[#d9e1ee] bg-white px-5 text-[#7a879d] shadow-sm">
                <Search className="h-5 w-5" strokeWidth={2.2} />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  className="w-full border-none bg-transparent text-[15px] font-medium text-[#33415c] outline-none placeholder:text-[#7a879d]"
                />
              </div>

              <div className="ml-auto flex items-center gap-3 lg:gap-5">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[#70809b] transition-all hover:bg-white hover:text-[#13224a]"
                  title="Notifications"
                >
                  <Bell className="h-6 w-6" strokeWidth={2.1} />
                </button>

                <Link
                  to="/settings"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[#70809b] transition-all hover:bg-white hover:text-[#13224a]"
                  title="Settings"
                >
                  <Settings className="h-6 w-6" strokeWidth={2.1} />
                </Link>

                <Link
                  to="/profile"
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white ${avatar.bgClass} text-[#425235] shadow-sm text-2xl`}
                  title={`Avatar: ${avatar.label}`}
                >
                  <span aria-hidden="true">{avatar.emoji}</span>
                  <span className="sr-only">Open profile</span>
                </Link>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                        isActive
                          ? "bg-[#d9e9c6] text-[#2d3a22]"
                          : "bg-white text-[#46536a]",
                      ].join(" ")
                    }
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </header>

          <main className="px-4 pb-8 pt-10 lg:px-8 lg:pb-10 lg:pt-12">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}