import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlarmPlus,
  BellRing,
  Camera,
  EyeOff,
  History,
  LogOut,
  Pill,
  QrCode,
  Scan,
  ShieldCheck,
} from "lucide-react";

import { env } from "../../../app/config/env";
import { getHistory, type ScanHistoryItem } from "../../../api/history.api";
import { getReminders, type ReminderItem } from "../../../api/reminders.api";
import { getCurrentUser } from "../../../api/users.api";
import { useAuthStore } from "../../auth/store/auth.store";
import { AVATAR_OPTIONS } from "../../../lib/avatar";
import { useAvatar } from "../../../hooks/useAvatar";

type RawRecord = Record<string, unknown>;

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAtLabel: string;
  statusLabel: string;
  imageUrl: string | null;
};

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatDateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildImageUrl(rawPath: unknown): string | null {
  const imagePath = firstNonEmptyString(rawPath);

  if (!imagePath || imagePath === "null") {
    return null;
  }

  const normalized = imagePath.replace(/\\/g, "/");

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${env.apiBaseUrl}${normalized}`;
  }

  return `${env.apiBaseUrl}/${normalized}`;
}

function normalizeHistoryItem(rawInput: ScanHistoryItem): ActivityItem {
  const raw = (rawInput ?? {}) as unknown as RawRecord;

  const statusLabel =
    firstNonEmptyString(raw.match_status, raw.matchStatus) ||
    (typeof raw.ocr_confidence === "number"
      ? raw.ocr_confidence >= 0.8
        ? "High confidence"
        : "Needs review"
      : "Saved");

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    title:
      firstNonEmptyString(
        raw.medicine_name,
        raw.title,
        raw.name,
        raw.barcode ? `Barcode ${raw.barcode}` : ""
      ) || "Saved medicine record",
    description:
      firstNonEmptyString(
        raw.translated_text,
        raw.translatedSummaryEn,
        raw.summary,
        raw.explanation,
        raw.usage
      ) || "Saved scan result available in history.",
    createdAtLabel: formatDateLabel(raw.created_at ?? raw.createdAt),
    statusLabel,
    imageUrl: buildImageUrl(raw.image_path ?? raw.image_url ?? raw.imageUrl),
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const storedToken = useAuthStore((state) => state.token);
  const { avatarId, avatar, setAvatarId } = useAvatar();

  const decodedToken = useMemo(() => decodeJwtPayload(storedToken), [storedToken]);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 60_000,
    enabled: Boolean(storedToken),
  });

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: getHistory,
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(storedToken),
  });

  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: getReminders,
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(storedToken),
  });

  const historyItems = useMemo(
    () => (historyQuery.data ?? []).map(normalizeHistoryItem).slice(0, 4),
    [historyQuery.data]
  );

  const reminders = remindersQuery.data ?? [];

  const activeReminders = reminders.filter((item: ReminderItem) =>
    Boolean(item.is_active ?? true)
  );

  const trackedMedicineCount = useMemo(() => {
    const unique = new Set(
      historyItems.map((item) => item.title.toLowerCase().trim()).filter(Boolean)
    );

    return unique.size;
  }, [historyItems]);

  const profileData = profileQuery.data;

  const fullName =
    firstNonEmptyString(
      profileData?.full_name,
      decodedToken?.full_name,
      decodedToken?.name
    ) || "Yaobox User";

  const email =
    firstNonEmptyString(
      profileData?.email,
      decodedToken?.email,
      decodedToken?.sub
    ) || "No email available";

  const languagePref =
    firstNonEmptyString(
      profileData?.language_pref,
      decodedToken?.language_pref,
      decodedToken?.locale
    ) || "English";

  const firstName = fullName.split(" ")[0] || "User";

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase mb-3">
            Profile
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-slate-600 max-w-xl">
            Keep personal details visible, account access clear, and recent
            activity easy to revisit.
          </p>
        </motion.div>

        <Link
          to="/scan"
          className="bg-brand-secondary text-white px-6 py-3 rounded-full flex items-center gap-2 hover:brightness-95 transition-all shadow-lg shadow-brand-secondary/20 font-medium text-sm"
        >
          <QrCode className="w-4 h-4" />
          Scan New Medicine
        </Link>
      </header>

      {!storedToken ? (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-relaxed">
          You are not signed in. Log in again so profile, history, and reminders
          can load.
        </div>
      ) : profileQuery.isError ? (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-relaxed">
          Profile data could not be loaded. The page is using token fallback data
          where possible.
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Scans",
            value: historyQuery.isLoading
              ? "..."
              : String(historyQuery.data?.length ?? 0),
            icon: Scan,
            color: "bg-brand-primary-container/40 text-brand-on-primary-container",
          },
          {
            label: "Active Reminders",
            value: remindersQuery.isLoading
              ? "..."
              : String(activeReminders.length),
            icon: BellRing,
            color: "bg-brand-tertiary-container/40 text-brand-tertiary",
          },
          {
            label: "Medicines Tracked",
            value: historyQuery.isLoading
              ? "..."
              : String(trackedMedicineCount),
            icon: Pill,
            color: "bg-slate-100 text-slate-700",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white border border-slate-100 rounded-[28px] p-6 flex flex-col gap-4 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color}`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                {stat.label}
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm relative overflow-hidden flex flex-col items-center text-center"
          >
            <div className="absolute top-0 left-0 w-full h-20 bg-brand-primary-container/40" />

            <div
              className={`w-24 h-24 rounded-full border-4 border-white mt-6 z-10 ${avatar.bgClass} flex items-center justify-center shadow-md text-5xl`}
              title={`Avatar: ${avatar.label}`}
            >
              <span aria-hidden="true">{avatar.emoji}</span>
              <span className="sr-only">Selected avatar: {avatar.label}</span>
            </div>

            <div className="mt-4 w-full">
              <h3 className="text-2xl font-semibold text-slate-900">
                {fullName}
              </h3>
              <p className="text-slate-500 text-sm mb-6">{email}</p>

              <div className="text-left bg-slate-50 rounded-[20px] p-4 mb-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Choose avatar
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {AVATAR_OPTIONS.map((option) => {
                    const isSelected = option.id === avatarId;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAvatarId(option.id)}
                        className={[
                          "flex flex-col items-center justify-center gap-2 rounded-[18px] border px-3 py-3 transition-all",
                          isSelected
                            ? "border-brand-primary bg-white shadow-sm ring-2 ring-brand-primary/20"
                            : "border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300",
                        ].join(" ")}
                        title={option.label}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-full ${option.bgClass} text-2xl`}
                          aria-hidden="true"
                        >
                          {option.emoji}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  This avatar is saved on this browser and appears in the top
                  profile icon.
                </p>
              </div>

              <div className="text-left bg-slate-50 rounded-[20px] p-4 mb-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1 font-medium">
                  Language preference
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {languagePref}
                </p>
              </div>

              <div className="text-left bg-slate-50 rounded-[20px] p-4 mb-6 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1 font-medium">
                  Password
                </p>
                <div className="flex justify-between items-center">
                  <p className="font-mono tracking-widest text-slate-900">
                    ••••••••••
                  </p>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full bg-transparent border border-brand-secondary text-brand-secondary py-3 rounded-full hover:bg-slate-50 transition-all font-medium text-sm"
                  disabled
                >
                  Edit Profile Deferred
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-50 border border-red-100 text-red-700 py-3 rounded-full hover:bg-red-100 transition-all font-medium text-sm flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-slate-900 ml-1">
              Quick Actions
            </h3>

            <Link
              to="/scan"
              className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-[22px] hover:bg-slate-50 transition-all text-sm font-medium shadow-sm group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span>Upload medicine image or report</span>
            </Link>

            <Link
              to="/reminders/create"
              className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-[22px] hover:bg-slate-50 transition-all text-sm font-medium shadow-sm group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand-tertiary-container/40 text-brand-tertiary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <AlarmPlus className="w-5 h-5" />
              </div>
              <span>Add medication reminder</span>
            </Link>

            <div className="rounded-[22px] bg-white border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    Security status
                  </p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Session handling is centralized. Password change remains
                    deferred until the documented backend route exists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              Recent Activity
            </h3>
            <Link
              to="/history"
              className="text-brand-primary text-sm font-medium hover:underline flex items-center gap-1"
            >
              View Full Logs
              <History className="w-4 h-4" />
            </Link>
          </div>

          {historyQuery.isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-24 rounded-[22px] bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <div className="rounded-[22px] bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-800 leading-relaxed">
              Recent activity could not be loaded from history yet.
            </div>
          ) : historyItems.length === 0 ? (
            <div className="rounded-[22px] bg-slate-50 border border-slate-100 px-4 py-5 text-sm text-slate-600 leading-relaxed">
              No saved activity yet. Scan and save a medicine result first.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {historyItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="flex items-center gap-4 p-4 border border-slate-100 rounded-[22px] hover:border-brand-primary-container/60 hover:bg-slate-50 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        className="w-full h-full object-cover"
                        alt={item.title}
                      />
                    ) : (
                      <Pill className="w-8 h-8 text-slate-400 -rotate-45" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-semibold text-slate-900 truncate pr-2">
                        {item.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                        {item.createdAtLabel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {item.description}
                    </p>
                  </div>

                  <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-brand-primary-container/40 text-brand-on-primary-container">
                    {item.statusLabel}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className="text-xs text-slate-500 leading-relaxed max-w-3xl">
        This profile page reads from the shared API client:
        <code> GET /users/me</code>, <code> GET /history/</code>, and
        <code> GET /reminders/</code>.
      </div>
    </div>
  );
}