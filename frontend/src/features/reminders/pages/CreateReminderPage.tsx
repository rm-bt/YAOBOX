import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlarmClock,
  CheckCircle2,
  Clock3,
  Pill,
  Plus,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ReminderPrefillState = {
  medicineId?: string | number;
  medicineName?: string;
  dosageNote?: string;
  sourceScanId?: string | number;
};

type ReminderFormState = {
  medicineId: string;
  reminderTime: string;
  frequency: string;
  dosageNote: string;
  isActive: boolean;
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

      if (found) return found;
    } catch {
      // ignore malformed storage values
    }
  }

  return null;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${path} with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildCreatePayload(
  form: ReminderFormState,
  state: ReminderPrefillState
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    reminder_time: form.reminderTime,
    frequency: form.frequency,
    dosage_note: form.dosageNote,
    is_active: form.isActive,
  };

  const cleanMedicineId = form.medicineId.trim();
  if (cleanMedicineId) {
    payload.medicine_id = cleanMedicineId;
  }

  if (state.medicineName?.trim()) {
    payload.medicine_name = state.medicineName.trim();
  }

  if (state.sourceScanId !== undefined && state.sourceScanId !== null) {
    const numericScanId = Number(state.sourceScanId);
    if (!Number.isNaN(numericScanId)) {
      payload.scan_id = numericScanId;
    }
  }

  return payload;
}

export default function CreateReminderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const state = (location.state ?? {}) as ReminderPrefillState;

  const prefillMedicineName = useMemo(
    () => state.medicineName?.trim() || "Medication reminder",
    [state.medicineName]
  );

  const [form, setForm] = useState<ReminderFormState>({
    medicineId: state.medicineId ? String(state.medicineId) : "",
    reminderTime: "",
    frequency: "daily",
    dosageNote: state.dosageNote ?? "",
    isActive: true,
  });

  const createReminder = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      requestJson<unknown>("/reminders/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      await queryClient.refetchQueries({ queryKey: ["reminders"], exact: true });
      navigate("/reminders", { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createReminder.reset();
    createReminder.mutate(buildCreatePayload(form, state));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Create Reminder
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Create a medication reminder
        </h1>

        <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
          Use the same clean reminder language from the main reminders page, but
          focus this screen on one task only: setting a reminder from a result.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Reminder creation supports adherence. It does not replace medical advice.
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center">
                <Pill className="w-7 h-7 -rotate-45" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Linked medicine
                </h2>
                <p className="text-sm text-slate-500">
                  Coming from the result flow when available.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 border border-slate-100 px-5 py-5">
              <p className="font-bold text-slate-900 text-lg">{prefillMedicineName}</p>

              {state.sourceScanId ? (
                <p className="text-sm text-slate-500 mt-2">
                  Source scan: {state.sourceScanId}
                </p>
              ) : null}

              {form.dosageNote ? (
                <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Suggested note:</span>{" "}
                  {form.dosageNote}
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <AlarmClock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Flow note</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              The architecture expects users to move from scan result to reminder
              creation in one obvious path. Keep this page boring, fast, and clear.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reminder details</h2>
              <p className="text-sm text-slate-500">
                Set time, frequency, note, and activation state.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Medicine ID (optional)
              </label>
              <input
                type="text"
                value={form.medicineId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medicineId: event.target.value,
                  }))
                }
                placeholder="Leave blank unless you know the linked medicine id"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Reminder time
              </label>
              <input
                type="datetime-local"
                value={form.reminderTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reminderTime: event.target.value,
                  }))
                }
                required
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency: event.target.value,
                  }))
                }
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              >
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Dosage note
              </label>
              <textarea
                value={form.dosageNote}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dosageNote: event.target.value,
                  }))
                }
                rows={4}
                placeholder="2 capsules after breakfast"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 resize-none"
              />
            </div>

            <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
              />
              <span className="text-sm font-medium text-slate-700">
                Create as active reminder
              </span>
            </label>

            {createReminder.isError ? (
              <div className="rounded-[20px] bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-700 leading-relaxed whitespace-pre-wrap break-words">
                {createReminder.error instanceof Error
                  ? createReminder.error.message
                  : "Reminder creation failed."}
              </div>
            ) : null}

            {createReminder.isSuccess ? (
              <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 px-4 py-4 text-sm text-emerald-700 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Reminder created successfully.</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={createReminder.isPending}
                className="rounded-full bg-brand-secondary px-6 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 transition-all hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createReminder.isPending ? "Creating..." : "Create reminder"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/reminders")}
                className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Open reminder center
              </button>

              <Link
                to="/scan"
                className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                <Clock3 className="w-4 h-4" />
                Back to scan
              </Link>
            </div>
          </form>
        </motion.div>
      </section>
    </div>
  );
}