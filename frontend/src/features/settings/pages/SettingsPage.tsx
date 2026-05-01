import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  BellRing,
  ChevronRight,
  Globe2,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
} from "lucide-react";

import { useTheme } from "../../../hooks/useTheme";
import { useAvatar } from "../../../hooks/useAvatar";
import { AVATAR_OPTIONS } from "../../../lib/avatar";

export default function SettingsPage() {
  const { theme, isDark, setTheme } = useTheme();
  const { avatarId, avatar, setAvatarId } = useAvatar();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-6">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Settings
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          Personalize YAOBOX
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Control appearance, avatar, notification behavior, and account shortcuts
          from one clear place.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container dark:bg-slate-800 dark:text-slate-100">
          <ShieldCheck size={16} />
          Settings stay local for this MVP unless backend persistence is added later.
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-20 w-20 rounded-full ${avatar.bgClass} flex items-center justify-center text-4xl border-4 border-white shadow-md`}
              >
                <span aria-hidden="true">{avatar.emoji}</span>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Current avatar
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {avatar.label}
                </h2>
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
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <span
                      className={`h-12 w-12 rounded-full ${option.bgClass} flex items-center justify-center text-2xl`}
                    >
                      {option.emoji}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-100">
                <Smartphone size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Reminder notifications
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
            className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-brand-primary-container/40 dark:bg-slate-800 flex items-center justify-center text-brand-on-primary-container dark:text-slate-100">
                <Palette size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Appearance
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose the visual mode for this browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={[
                  "rounded-[24px] border p-5 text-left transition-all",
                  theme === "light"
                    ? "border-brand-primary bg-brand-primary-container/30 ring-2 ring-brand-primary/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900",
                ].join(" ")}
              >
                <Sun className="w-7 h-7 text-amber-500 mb-4" />
                <p className="font-bold text-slate-900 dark:text-white">
                  Light mode
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
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
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900",
                ].join(" ")}
              >
                <Moon className="w-7 h-7 text-indigo-400 mb-4" />
                <p className="font-bold text-slate-900 dark:text-white">
                  Dark mode
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Lower-glare interface for night work.
                </p>
              </button>
            </div>

            <div className="mt-5 rounded-[20px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
              Current mode: <strong>{isDark ? "Dark" : "Light"}</strong>
            </div>
          </motion.div>

          <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5">
              Quick settings
            </h2>

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
                    className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-4 hover:bg-white dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-950 flex items-center justify-center text-slate-700 dark:text-slate-100">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {item.text}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
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