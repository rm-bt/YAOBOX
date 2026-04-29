import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  BellRing,
  Camera,
  Clock3,
  History,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RawRecord = Record<string, unknown>;

type DashboardUser = {
  id?: string | number;
  full_name?: string;
  email?: string;
  language_pref?: string | null;
};

type DashboardHistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  sourceType: string;
  createdAt: string;
  confidenceText: string;
};

type DashboardReminderItem = {
  id: string;
  title: string;
  timeText: string;
  frequencyText: string;
  dosageText: string;
  isActive: boolean;
  reminderTimeRaw: string;
};

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
        (
          (parsed.state as Record<string, unknown> | undefined)
            ?.session as Record<string, unknown> | undefined
        )?.access_token,
        (
          (parsed.state as Record<string, unknown> | undefined)
            ?.session as Record<string, unknown> | undefined
        )?.token,
      ];

      const found = candidates.find(
        (value): value is string => typeof value === "string" && value.length > 0
      );

      if (found) return found.trim();
    } catch {
      // ignore malformed values
    }
  }

  return null;
}

async function requestJsonFromPaths<T>(paths: string[]): Promise<T> {
  const token = getStoredToken();
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }

        const text = await response.text();
        throw new Error(
          text || `Request failed for ${path} with status ${response.status}`
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown request failure");
    }
  }

  throw lastError ?? new Error("No dashboard endpoint responded successfully.");
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
      objectValue.reminders,
      objectValue.records,
    ].find(Array.isArray);

    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function formatDateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Time not set";

  const fullDate = new Date(value);
  if (!Number.isNaN(fullDate.getTime())) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(fullDate);
  }

  const timeOnly = value.trim();
  if (/^\d{2}:\d{2}/.test(timeOnly)) return timeOnly.slice(0, 5);

  return timeOnly;
}

function humanizeSourceType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "image_upload") return "Image upload";
  if (normalized === "barcode") return "Barcode";
  if (normalized === "manual_entry") return "Manual entry";
  if (normalized === "prescription") return "Prescription";
  if (normalized === "report") return "Report";

  return value.replace(/_/g, " ");
}

function buildConfidenceLabel(raw: RawRecord): string {
  const confidence = raw.confidence;

  if (typeof confidence === "number") {
    return `${Math.round(confidence * 100)}% confidence`;
  }

  if (confidence && typeof confidence === "object") {
    const objectConfidence = confidence as Record<string, unknown>;
    const ocr = objectConfidence.ocr;

    if (typeof ocr === "number") {
      return `${Math.round(ocr * 100)}% OCR`;
    }
  }

  if (typeof raw.ocr_confidence === "number") {
    return `${Math.round(raw.ocr_confidence * 100)}% OCR`;
  }

  const sourceType = firstNonEmptyString(raw.source_type, raw.sourceType).toLowerCase();
  if (sourceType === "barcode") {
    return "Barcode lookup";
  }

  return "Not scored";
}

function normalizeHistoryItem(raw: RawRecord): DashboardHistoryItem {
  const title =
    firstNonEmptyString(
      raw.medicine_name,
      raw.title,
      raw.name,
      raw.barcode ? `Barcode ${String(raw.barcode)}` : ""
    ) || "Saved scan";

  const subtitle =
    firstNonEmptyString(
      raw.translated_text,
      raw.translatedSummary,
      raw.translatedSummaryEn,
      raw.translated_summary_en,
      raw.usage,
      raw.dosage,
      raw.summary,
      raw.note
    ) || "Saved scan result available";

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    title,
    subtitle,
    sourceType: humanizeSourceType(
      firstNonEmptyString(raw.source_type, raw.sourceType, raw.match_status) || "scan"
    ),
    createdAt: formatDateLabel(raw.created_at ?? raw.createdAt ?? raw.date),
    confidenceText: buildConfidenceLabel(raw),
  };
}

function normalizeReminderItem(raw: RawRecord): DashboardReminderItem {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    title:
      firstNonEmptyString(
        raw.title,
        raw.medicine_name,
        raw.medicineName
      ) || "Medication reminder",
    timeText: formatTimeLabel(
      raw.reminder_time ?? raw.remind_time ?? raw.reminderTime ?? raw.remindTime ?? raw.time
    ),
    frequencyText:
      firstNonEmptyString(raw.frequency, raw.repeat, raw.schedule) || "daily",
    dosageText:
      firstNonEmptyString(raw.dosage_note, raw.dosage, raw.note) || "No dosage note",
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    reminderTimeRaw: firstNonEmptyString(
      raw.reminder_time,
      raw.remind_time,
      raw.reminderTime,
      raw.remindTime,
      raw.time
    ),
  };
}

const StatCard = ({
  icon,
  value,
  label,
  colorClass,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  colorClass: string;
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-5"
  >
    <div
      className={`w-14 h-14 ${colorClass} rounded-full flex items-center justify-center`}
    >
      {icon}
    </div>
    <div>
      <div className="text-3xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-slate-500 font-medium mt-2">{label}</div>
    </div>
  </motion.div>
);

const ActionCard = ({
  icon,
  title,
  description,
  primary = false,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  primary?: boolean;
  to: string;
}) => (
  <Link to={to}>
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className={`rounded-[28px] p-6 h-full transition-all ${
        primary
          ? "bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20"
          : "bg-white border border-slate-100 text-slate-900 shadow-sm"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 ${
          primary
            ? "bg-white/10 text-white"
            : "bg-brand-primary-container/40 text-brand-on-primary-container"
        }`}
      >
        {icon}
      </div>

      <h3 className="text-[1.55rem] font-bold leading-tight">{title}</h3>
      <p
        className={`mt-3 text-base leading-relaxed ${
          primary ? "text-white/75" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </motion.div>
  </Link>
);

export default function DashboardPage() {
  const authToken = getStoredToken();

  const userQuery = useQuery({
    queryKey: ["dashboard", "user"],
    queryFn: () => requestJsonFromPaths<DashboardUser>(["/users/me", "/users/me/"]),
    retry: false,
    staleTime: 60_000,
    enabled: Boolean(authToken),
    refetchOnWindowFocus: false,
  });

  const historyQuery = useQuery({
    queryKey: ["dashboard", "history"],
    queryFn: () => requestJsonFromPaths<unknown>(["/history/", "/history"]),
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(authToken),
    refetchOnWindowFocus: false,
  });

  const remindersQuery = useQuery({
    queryKey: ["dashboard", "reminders"],
    queryFn: () => requestJsonFromPaths<unknown>(["/reminders/", "/reminders"]),
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(authToken),
    refetchOnWindowFocus: false,
  });

  const historyRecords = asArray<RawRecord>(historyQuery.data).map(normalizeHistoryItem);

  const reminderRecords = asArray<RawRecord>(remindersQuery.data)
    .map(normalizeReminderItem)
    .filter((item) => item.isActive);

  const userName =
    firstNonEmptyString(userQuery.data?.full_name, userQuery.data?.email) || "there";
  const firstName = userName.split(" ")[0] || "there";

  const totalScans = historyRecords.length;
  const activeReminders = reminderRecords.length;

  const recentRecord = historyRecords[0];

  const nextReminder = [...reminderRecords].sort((a, b) => {
    const aDate = new Date(a.reminderTimeRaw).getTime();
    const bDate = new Date(b.reminderTimeRaw).getTime();

    if (Number.isNaN(aDate) && Number.isNaN(bDate)) return 0;
    if (Number.isNaN(aDate)) return 1;
    if (Number.isNaN(bDate)) return -1;

    return aDate - bDate;
  })[0];

  return (
    <div className="space-y-8 pb-4">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Dashboard
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Hi, {firstName}
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Keep the main action obvious: scan medicine, review recent results, and stay
          on top of reminders without drowning the page in noise.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Verified data, OCR text, and AI explanation stay visibly separate.
        </div>
      </motion.section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          icon={<ScanLine size={28} />}
          value={historyQuery.isLoading ? "..." : String(totalScans)}
          label="Saved scans"
          colorClass="bg-brand-primary-container/40 text-brand-on-primary-container"
        />
        <StatCard
          icon={<Clock3 size={28} />}
          value={remindersQuery.isLoading ? "..." : String(activeReminders)}
          label="Active reminders"
          colorClass="bg-brand-tertiary-container/40 text-brand-tertiary"
        />
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
          <Link
            to="/scan"
            className="text-brand-primary font-bold text-sm flex items-center gap-1 hover:underline"
          >
            Open scan flow <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ActionCard
            primary
            to="/scan"
            icon={<Camera size={24} />}
            title="Scan Medicine"
            description="Start image upload or camera capture for medicine, prescription, or report."
          />
          <ActionCard
            to="/scan"
            icon={<Upload size={24} />}
            title="Upload Prescription"
            description="Jump straight into the OCR and translation workflow."
          />
          <ActionCard
            to="/history"
            icon={<History size={24} />}
            title="View History"
            description="Reopen prior scans and review translated details."
          />
          <ActionCard
            to="/reminders"
            icon={<BellRing size={24} />}
            title="Reminder Center"
            description="Check schedules, edit active reminders, and manage follow-up."
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-0">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <span className="inline-block px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full mb-6 w-fit">
              TRUST BANNER
            </span>

            <h3 className="text-3xl font-bold mb-4 tracking-tight text-slate-900">
              Understand what YAOBOX can and cannot claim
            </h3>

            <p className="text-slate-600 mb-6 leading-relaxed max-w-2xl">
              This product is for understanding Chinese medicine information and
              managing your own records. It can extract text, translate it,
              explain it, save it, and help you create reminders. It is not a
              diagnosis engine and it should not pretend otherwise.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                Verified data
              </span>
              <span className="px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                OCR text
              </span>
              <span className="px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                AI explanation
              </span>
            </div>
          </div>

          <div className="min-h-[240px] lg:min-h-full relative overflow-hidden bg-brand-primary-container/20">
            <img
              src="/hero-mockup.png"
              alt="YAOBOX dashboard support visual"
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-brand-primary/5" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-900">Recent Scan</h2>
            <Link
              to="/history"
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              Open history
            </Link>
          </div>

          {historyQuery.isLoading ? (
            <div className="h-28 rounded-[22px] bg-slate-100 animate-pulse" />
          ) : historyQuery.isError ? (
            <div className="rounded-[22px] bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-800 leading-relaxed flex items-start gap-3">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div>History could not be loaded from the backend.</div>
            </div>
          ) : !recentRecord ? (
            <div className="rounded-[22px] bg-slate-50 border border-slate-100 px-4 py-5 text-sm text-slate-600 leading-relaxed">
              No saved scans yet. Start with the main scan action.
            </div>
          ) : (
            <Link
              to="/history"
              className="block rounded-[22px] border border-slate-100 px-5 py-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-lg truncate">
                    {recentRecord.title}
                  </p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                    {recentRecord.subtitle}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container whitespace-nowrap">
                  {recentRecord.sourceType}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-500">
                <span>{recentRecord.createdAt}</span>
                <span>•</span>
                <span>{recentRecord.confidenceText}</span>
              </div>
            </Link>
          )}
        </div>

        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-900">Next Reminder</h2>
            <Link
              to="/reminders"
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              Open reminders
            </Link>
          </div>

          {remindersQuery.isLoading ? (
            <div className="h-28 rounded-[22px] bg-slate-100 animate-pulse" />
          ) : remindersQuery.isError ? (
            <div className="rounded-[22px] bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-800 leading-relaxed flex items-start gap-3">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div>Reminder data could not be loaded from the backend.</div>
            </div>
          ) : !nextReminder ? (
            <div className="rounded-[22px] bg-slate-50 border border-slate-100 px-4 py-5 text-sm text-slate-600 leading-relaxed">
              No active reminders yet. Create one from a result page or open the
              reminder center.
            </div>
          ) : (
            <div className="rounded-[22px] bg-brand-tertiary-container/25 border border-brand-tertiary-container px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand-tertiary">
                    Upcoming
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {nextReminder.timeText}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-brand-tertiary">
                  <BellRing size={22} />
                </div>
              </div>

              <p className="mt-4 font-bold text-slate-900">{nextReminder.title}</p>
              <p className="mt-1 text-sm text-slate-700">{nextReminder.dosageText}</p>

              <div className="mt-3 inline-flex px-3 py-1 rounded-full bg-white text-xs font-bold text-slate-700">
                {nextReminder.frequencyText}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}