import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlarmPlus,
  BellRing,
  Camera,
  EyeOff,
  Globe2,
  History,
  Loader2,
  LogOut,
  Mail,
  Pill,
  QrCode,
  Scan,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuthStore } from "../../auth/store/auth.store";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RawRecord = Record<string, unknown>;

type UserProfile = {
  id?: string | number;
  email?: string;
  full_name?: string;
  language_pref?: string;
  created_at?: string;
};

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

function getStoredToken(): string | null {
  const directKeys = [
    "yaobox_access_token",
    "access_token",
    "token",
    "auth_token",
    "yaobox_token",
  ];

  for (const key of directKeys) {
    const value = window.localStorage.getItem(key);
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const jsonKeys = ["session", "auth", "auth-storage", "yaobox-auth"];

  for (const key of jsonKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const candidates = [
        parsed.access_token,
        parsed.token,
        (parsed.session as Record<string, unknown> | undefined)?.access_token,
        (parsed.session as Record<string, unknown> | undefined)?.token,
        (parsed.state as Record<string, unknown> | undefined)?.access_token,
        (parsed.state as Record<string, unknown> | undefined)?.token,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch {
      // ignore malformed storage values
    }
  }

  return null;
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

async function requestJsonFromPaths<T>(
  paths: string[],
  init?: RequestInit
): Promise<T> {
  const token = getStoredToken();
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }

        const text = await response.text();
        throw new Error(text || `Request failed for ${path} with status ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown profile request failure");
    }
  }

  throw lastError ?? new Error("No supported profile endpoint responded successfully.");
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const nested = [
      objectValue.items,
      objectValue.results,
      objectValue.data,
      objectValue.history,
      objectValue.records,
      objectValue.reminders,
    ].find(Array.isArray);

    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
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

function normalizeHistoryItem(rawInput: unknown): ActivityItem {
  const raw = (rawInput ?? {}) as RawRecord;
  const medicine = ((raw.medicine as RawRecord | undefined) ?? {}) as RawRecord;

  const confidence = raw.confidence;
  let statusLabel = "Saved";

  if (typeof confidence === "number") {
    statusLabel = confidence >= 0.8 ? "Verified" : "Pending";
  } else if (typeof raw.match_status === "string" && raw.match_status.trim()) {
    statusLabel = raw.match_status.trim();
  } else if (typeof medicine.matchStatus === "string" && medicine.matchStatus.trim()) {
    statusLabel = medicine.matchStatus.trim();
  }

  return {
    id: String(raw.id ?? raw.scanId ?? raw.scan_id ?? crypto.randomUUID()),
    title:
      firstNonEmptyString(
        raw.title,
        raw.medicine_name,
        medicine.nameEn,
        medicine.name_en,
        medicine.canonicalNameZh,
        medicine.canonical_name_zh,
        raw.name
      ) || "Saved medicine record",
    description:
      firstNonEmptyString(
        raw.translatedSummaryEn,
        raw.translated_summary_en,
        raw.summary,
        raw.explanation,
        raw.note
      ) || "Saved scan result available in history.",
    createdAtLabel: formatDateLabel(raw.created_at ?? raw.createdAt ?? raw.date),
    statusLabel,
    imageUrl:
      firstNonEmptyString(
        raw.image_url,
        raw.imageUrl,
        raw.imagePreview,
        raw.thumbnail_url
      ) || null,
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const storedToken = useAuthStore((state) => state.token);

  const decodedToken = useMemo(() => decodeJwtPayload(storedToken), [storedToken]);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () =>
      requestJsonFromPaths<UserProfile>(["/users/me", "/users/me/"]),
    retry: false,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ["profile", "history-preview"],
    queryFn: () => requestJsonFromPaths<unknown>(["/history", "/history/"]),
    retry: false,
    staleTime: 30_000,
  });

  const remindersQuery = useQuery({
    queryKey: ["profile", "reminders-preview"],
    queryFn: () => requestJsonFromPaths<unknown>(["/reminders", "/reminders/"]),
    retry: false,
    staleTime: 30_000,
  });

  const historyItems = useMemo(
    () => asArray<RawRecord>(historyQuery.data).map(normalizeHistoryItem).slice(0, 4),
    [historyQuery.data]
  );

  const reminders = useMemo(
    () => asArray<RawRecord>(remindersQuery.data),
    [remindersQuery.data]
  );

  const activeReminders = reminders.filter((item) =>
    Boolean((item as RawRecord).is_active ?? (item as RawRecord).isActive ?? true)
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
            Keep personal details visible, account access clear, and recent activity easy
            to revisit.
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

      {profileQuery.isError ? (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-relaxed">
          Profile endpoint is not available in the current backend response path.
          This screen is using session fallback data where possible.
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Scans",
            value: historyQuery.isLoading ? "..." : String(historyItems.length),
            icon: Scan,
            color: "bg-brand-primary-container/40 text-brand-on-primary-container",
          },
          {
            label: "Active Reminders",
            value: remindersQuery.isLoading ? "..." : String(activeReminders.length),
            icon: BellRing,
            color: "bg-brand-tertiary-container/40 text-brand-tertiary",
          },
          {
            label: "Medicines Tracked",
            value: historyQuery.isLoading ? "..." : String(trackedMedicineCount),
            icon: Pill,
            color: "bg-slate-100 text-slate-700",
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white border border-slate-100 rounded-[28px] p-6 flex flex-col gap-4 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                {stat.label}
              </p>
              <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
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
            <div className="w-24 h-24 rounded-full border-4 border-white mt-6 z-10 bg-brand-primary-container/40 flex items-center justify-center shadow-md">
              <UserRound className="w-12 h-12 text-brand-on-primary-container" />
            </div>

            <div className="mt-4 w-full">
              <h3 className="text-2xl font-semibold text-slate-900">{fullName}</h3>
              <p className="text-slate-500 text-sm mb-6">{email}</p>

              <div className="text-left bg-slate-50 rounded-[20px] p-4 mb-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1 font-medium">Language preference</p>
                <div className="flex justify-between items-center">
                  <p className="text-slate-900 font-medium">{languagePref}</p>
                  <Globe2 className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="text-left bg-slate-50 rounded-[20px] p-4 mb-6 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1 font-medium">Password</p>
                <div className="flex justify-between items-center">
                  <p className="font-mono tracking-widest text-slate-900">••••••••••</p>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full bg-transparent border border-brand-secondary text-brand-secondary py-3 rounded-full hover:bg-slate-50 transition-all font-medium text-sm"
                  disabled
                >
                  Edit Profile
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
            <h3 className="text-lg font-semibold text-slate-900 ml-1">Quick Actions</h3>

            <Link
              to="/scan"
              className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-[22px] hover:bg-slate-50 transition-all text-sm font-medium shadow-sm group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span>Upload Medication Report</span>
            </Link>

            <Link
              to="/reminders/create"
              className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-[22px] hover:bg-slate-50 transition-all text-sm font-medium shadow-sm group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand-tertiary-container/40 text-brand-tertiary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <AlarmPlus className="w-5 h-5" />
              </div>
              <span>Add Smart Reminder</span>
            </Link>

            <div className="rounded-[22px] bg-white border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Security status</p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Session handling is centralized. Password change remains deferred until the
                    documented backend route exists.
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
            <h3 className="text-xl font-semibold text-slate-900">Recent Activity</h3>
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
              {historyItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08 }}
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
                    <p className="text-sm text-slate-500 truncate">{item.description}</p>
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
        This page reads profile data from <code>GET /users/me</code> when available and falls
        back to session/token data when the profile endpoint is not mounted yet. Recent activity
        is derived from history and reminder counts only if those endpoints are currently reachable.
      </div>
    </div>
  );
}