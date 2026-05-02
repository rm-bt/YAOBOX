import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  BellRing,
  ChevronRight,
  Globe2,
  Palette,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";

import { useTheme } from "../../../hooks/useTheme";
import { useAvatar } from "../../../hooks/useAvatar";
import { AVATAR_OPTIONS } from "../../../lib/avatar";
import { ThemeToggle } from "../../../components/ThemeToggle";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { avatarId, avatar, setAvatarId } = useAvatar();

  const isDark = theme === "dark";

  const pageClass = isDark
    ? "text-white"
    : "text-slate-900";

  const cardClass = isDark
    ? "rounded-[32px] border border-slate-800 bg-slate-950 p-6 shadow-sm"
    : "rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm";

  const mutedText = isDark ? "text-slate-300" : "text-slate-600";
  const subtleText = isDark ? "text-slate-400" : "text-slate-500";
  const softPanel = isDark
    ? "border-slate-800 bg-slate-900"
    : "border-slate-100 bg-slate-50";

  return (
    <div className={`max-w-6xl mx-auto space-y-8 pb-6 ${pageClass}`}>
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Settings
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
          Personalize YAOBOX
        </h1>

        <p className={`text-lg max-w-3xl leading-relaxed ${mutedText}`}>
          Control appearance, avatar, notification behavior, and account shortcuts
          from one clear place.
        </p>

        <div
          className={[
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            isDark
              ? "bg-slate-800 text-slate-100"
              : "bg-brand-primary-container/40 text-brand-on-primary-container",
          ].join(" ")}
        >
          <ShieldCheck size={16} />
          Settings stay local for this MVP unless backend persistence is added later.
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-20 w-20 rounded-full ${avatar.bgClass} flex items-center justify-center text-4xl border-4 border-white shadow-md`}
              >
                <span aria-hidden="true">{avatar.emoji}</span>
              </div>

              <div>
                <p className={`text-sm font-bold uppercase tracking-[0.12em] ${subtleText}`}>
                  Current avatar
                </p>
                <h2 className="text-2xl font-bold mt-1">{avatar.label}</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {AVATAR_OPTIONS.map((option) => {
                const selected = option.id === avatarId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAvatarId(option.id)}
                    className={[
                      "rounded-[20px] border px-3 py-4 transition-all flex flex-col items-center gap-2",
                      selected
                        ? "border-brand-primary bg-brand-primary-container/30 ring-2 ring-brand-primary/20"
                        : isDark
                          ? "border-slate-800 bg-slate-900 hover:bg-slate-800"
                          : "border-slate-200 bg-slate-50 hover:bg-white",
                    ].join(" ")}
                  >
                    <span
                      className={`h-12 w-12 rounded-full ${option.bgClass} flex items-center justify-center text-2xl`}
                    >
                      {option.emoji}
                    </span>
                    <span className={`text-xs font-semibold text-center ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <div
                className={[
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700",
                ].join(" ")}
              >
                <Smartphone size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Reminder notifications</h2>
                <p className={`text-sm ${subtleText}`}>
                  Managed from the reminder center.
                </p>
              </div>
            </div>

            <Link
              to="/reminders"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
            >
              Open reminder center
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cardClass}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    isDark
                      ? "bg-slate-800 text-slate-100"
                      : "bg-brand-primary-container/40 text-brand-on-primary-container",
                  ].join(" ")}
                >
                  <Palette size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Appearance</h2>
                  <p className={`text-sm ${subtleText}`}>
                    Choose the visual mode for this browser.
                  </p>
                </div>
              </div>

              <ThemeToggle compact />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={[
                  "rounded-[24px] border p-5 text-left transition-all",
                  theme === "light"
                    ? "border-brand-primary bg-brand-primary-container/30 ring-2 ring-brand-primary/20"
                    : isDark
                      ? "border-slate-800 bg-slate-900 hover:bg-slate-800"
                      : "border-slate-200 bg-slate-50 hover:bg-white",
                ].join(" ")}
              >
                <p className="text-2xl mb-4">☀️</p>
                <p className="font-bold">Light mode</p>
                <p className={`text-sm mt-2 ${mutedText}`}>
                  Clean bright interface for regular use.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={[
                  "rounded-[24px] border p-5 text-left transition-all",
                  theme === "dark"
                    ? "border-brand-primary bg-slate-800 ring-2 ring-brand-primary/20"
                    : isDark
                      ? "border-slate-800 bg-slate-900 hover:bg-slate-800"
                      : "border-slate-200 bg-slate-50 hover:bg-white",
                ].join(" ")}
              >
                <p className="text-2xl mb-4">🌙</p>
                <p className="font-bold">Dark mode</p>
                <p className={`text-sm mt-2 ${mutedText}`}>
                  Lower-glare interface for night work.
                </p>
              </button>
            </div>

            <div className={`mt-5 rounded-[20px] border px-4 py-4 text-sm ${softPanel} ${mutedText}`}>
              Current mode: <strong>{theme === "dark" ? "Dark" : "Light"}</strong>
            </div>
          </motion.div>

          <div className={cardClass}>
            <h2 className="text-xl font-bold mb-5">Quick settings</h2>

            <div className="space-y-3">
              {[
                {
                  icon: UserRound,
                  title: "Profile",
                  text: "View your account and activity summary.",
                  to: "/profile",
                },
                {
                  icon: BellRing,
                  title: "Reminders",
                  text: "Create and manage medication reminders.",
                  to: "/reminders",
                },
                {
                  icon: Globe2,
                  title: "Language preference",
                  text: "Backend language preference is currently read-only.",
                  to: "/profile",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className={[
                      "flex items-center justify-between gap-4 rounded-[22px] border px-4 py-4 transition-all",
                      isDark
                        ? "border-slate-800 bg-slate-900 hover:bg-slate-800"
                        : "border-slate-100 bg-slate-50 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-700",
                        ].join(" ")}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold">{item.title}</p>
                        <p className={`text-sm ${subtleText}`}>{item.text}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${subtleText}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}