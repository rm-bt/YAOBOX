import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlarmClock,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pill,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RawRecord = Record<string, unknown>;

type ReminderItem = {
  id: string;
  title: string;
  medicineId: string;
  reminderTimeRaw: string;
  reminderTimeText: string;
  frequency: string;
  dosageNote: string;
  isActive: boolean;
};

type ReminderFormState = {
  medicineId: string;
  reminderTime: string;
  frequency: string;
  dosageNote: string;
  isActive: boolean;
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
      // ignore malformed values
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

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const nested = [
      objectValue.items,
      objectValue.results,
      objectValue.data,
      objectValue.reminders,
      objectValue.records,
    ].find(Array.isArray);

    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
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

  if (/^\d{2}:\d{2}/.test(value.trim())) return value.trim().slice(0, 5);

  return value;
}

function isDueToday(value: string): boolean {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function normalizeReminder(raw: RawRecord): ReminderItem {
  const medicine = ((raw.medicine as RawRecord | undefined) ?? {}) as RawRecord;

  const reminderTimeRaw = firstNonEmptyString(
    raw.reminder_time,
    raw.remind_time,
    raw.reminderTime,
    raw.remindTime,
    raw.time
  );

  const medicineId =
    typeof raw.medicine_id === "number"
      ? String(raw.medicine_id)
      : firstNonEmptyString(raw.medicine_id);

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    title:
      firstNonEmptyString(
        raw.title,
        raw.medicine_name,
        raw.medicineName,
        medicine.nameEn,
        medicine.name_en,
        medicine.canonicalNameZh,
        medicine.canonical_name_zh
      ) || "Medication reminder",
    medicineId,
    reminderTimeRaw,
    reminderTimeText: formatTimeLabel(reminderTimeRaw),
    frequency:
      firstNonEmptyString(raw.frequency, raw.repeat, raw.schedule) || "daily",
    dosageNote:
      firstNonEmptyString(raw.dosage_note, raw.dosage, raw.note) || "No dosage note",
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
  };
}

function buildCreatePayload(form: ReminderFormState): Record<string, unknown> {
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

  return payload;
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
    <div className={`w-14 h-14 ${colorClass} rounded-full flex items-center justify-center`}>
      {icon}
    </div>
    <div>
      <div className="text-3xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-slate-500 font-medium mt-2">{label}</div>
    </div>
  </motion.div>
);

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const authToken = getStoredToken();

  const [form, setForm] = useState<ReminderFormState>({
    medicineId: "",
    reminderTime: "",
    frequency: "daily",
    dosageNote: "",
    isActive: true,
  });
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null);

  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: () => requestJson<unknown>("/reminders/"),
    staleTime: 10_000,
    retry: false,
    enabled: Boolean(authToken),
    refetchOnWindowFocus: false,
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
    onMutate: () => {
      setActiveMutationId("create");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      await queryClient.refetchQueries({ queryKey: ["reminders"], exact: true });
      setForm({
        medicineId: "",
        reminderTime: "",
        frequency: "daily",
        dosageNote: "",
        isActive: true,
      });
    },
    onSettled: () => {
      setActiveMutationId(null);
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) =>
      requestJson<unknown>(`/reminders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onMutate: ({ id }) => {
      setActiveMutationId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      await queryClient.refetchQueries({ queryKey: ["reminders"], exact: true });
    },
    onSettled: () => {
      setActiveMutationId(null);
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) =>
      requestJson<unknown>(`/reminders/${id}`, {
        method: "DELETE",
      }),
    onMutate: (id) => {
      setActiveMutationId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      await queryClient.refetchQueries({ queryKey: ["reminders"], exact: true });
    },
    onSettled: () => {
      setActiveMutationId(null);
    },
  });

  const reminders = useMemo(
    () => asArray<RawRecord>(remindersQuery.data).map(normalizeReminder),
    [remindersQuery.data]
  );

  const reminderById = useMemo(
    () => new Map(reminders.map((item) => [item.id, item])),
    [reminders]
  );

  const activeReminders = useMemo(
    () => reminders.filter((item) => item.isActive),
    [reminders]
  );

  const inactiveReminders = useMemo(
    () => reminders.filter((item) => !item.isActive),
    [reminders]
  );

  const dueToday = useMemo(
    () => activeReminders.filter((item) => isDueToday(item.reminderTimeRaw)),
    [activeReminders]
  );

  const isAnyMutationPending =
    createReminder.isPending || updateReminder.isPending || deleteReminder.isPending;

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.reminderTime) {
      return;
    }

    createReminder.reset();
    updateReminder.reset();
    deleteReminder.reset();
    createReminder.mutate(buildCreatePayload(form));
  }

  function handleToggleActive(item: ReminderItem) {
    const freshItem = reminderById.get(item.id);
    if (!freshItem || isAnyMutationPending) {
      return;
    }

    createReminder.reset();
    updateReminder.reset();
    deleteReminder.reset();

    updateReminder.mutate({
      id: freshItem.id,
      payload: {
        reminder_time: freshItem.reminderTimeRaw,
        frequency: freshItem.frequency,
        dosage_note:
          freshItem.dosageNote === "No dosage note" ? "" : freshItem.dosageNote,
        is_active: !freshItem.isActive,
        ...(freshItem.medicineId ? { medicine_id: freshItem.medicineId } : {}),
        ...(freshItem.title ? { medicine_name: freshItem.title } : {}),
      },
    });
  }

  function handleDelete(itemId: string) {
    if (!reminderById.has(itemId) || isAnyMutationPending) {
      return;
    }

    createReminder.reset();
    updateReminder.reset();
    deleteReminder.reset();
    deleteReminder.mutate(itemId);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-6">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Reminder Center
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Manage medication reminders
        </h1>

        <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
          Keep reminder setup simple. This page should help users create, review,
          activate, and remove schedules without friction.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Reminders support medication management. They do not replace medical advice.
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={<BellRing size={26} />}
          value={remindersQuery.isLoading ? "..." : String(activeReminders.length)}
          label="Active reminders"
          colorClass="bg-brand-primary-container/40 text-brand-on-primary-container"
        />

        <StatCard
          icon={<CalendarDays size={26} />}
          value={remindersQuery.isLoading ? "..." : String(dueToday.length)}
          label="Due today"
          colorClass="bg-brand-tertiary-container/40 text-brand-tertiary"
        />

        <StatCard
          icon={<Clock3 size={26} />}
          value={
            remindersQuery.isLoading
              ? "..."
              : activeReminders[0]?.reminderTimeText ?? "--"
          }
          label="Next visible time"
          colorClass="bg-slate-100 text-slate-700"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create reminder</h2>
              <p className="text-sm text-slate-500">
                Use the backend reminder contract directly.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleCreateSubmit}>
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
                  : "Reminder creation failed. Check the backend response and submitted fields."}
              </div>
            ) : null}

            {createReminder.isSuccess ? (
              <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 px-4 py-4 text-sm text-emerald-700 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Reminder created successfully.</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={createReminder.isPending || isAnyMutationPending}
              className="w-full rounded-full bg-brand-secondary px-6 py-4 text-white font-bold shadow-lg shadow-brand-secondary/20 transition-all hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createReminder.isPending ? "Creating reminder..." : "Create reminder"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Active reminders</h2>
                <p className="text-sm text-slate-500">
                  Simple schedule display, honest status, clean controls.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                <AlarmClock size={14} />
                {activeReminders.length} active
              </div>
            </div>

            {remindersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-28 rounded-[24px] bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : remindersQuery.isError ? (
              <div className="rounded-[22px] bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-800 leading-relaxed flex items-start gap-3">
                <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  Reminder data could not be loaded from <code>/reminders/</code>.
                </div>
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="rounded-[22px] bg-slate-50 border border-slate-100 px-4 py-5 text-sm text-slate-600 leading-relaxed">
                No active reminders yet. Create one here or from a scan result.
              </div>
            ) : (
              <div className="space-y-4">
                {activeReminders.map((item) => {
                  const isBusy = activeMutationId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      className="rounded-[24px] border border-slate-100 bg-slate-50/70 px-5 py-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-lg">{item.title}</p>
                            <span className="rounded-full bg-brand-primary-container/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-on-primary-container">
                              {item.frequency}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-600">{item.dosageNote}</p>

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={14} />
                              {item.reminderTimeText}
                            </span>

                            {item.medicineId ? (
                              <span className="inline-flex items-center gap-1">
                                <Pill size={14} />
                                Medicine ID: {item.medicineId}
                              </span>
                            ) : null}

                            {isDueToday(item.reminderTimeRaw) ? (
                              <span className="rounded-full bg-brand-tertiary-container/40 px-2 py-1 font-bold text-brand-tertiary">
                                Due today
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            disabled={isAnyMutationPending || isBusy}
                            className="rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60"
                          >
                            {isBusy && updateReminder.isPending
                              ? "Updating..."
                              : "Deactivate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={isAnyMutationPending || isBusy}
                            className="rounded-full bg-red-50 border border-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1"
                          >
                            <Trash2 size={12} />
                            {isBusy && deleteReminder.isPending ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Inactive reminders</h2>
                <p className="text-sm text-slate-500">
                  Keep inactive reminders visible. Never hide unsaved or disabled states.
                </p>
              </div>
            </div>

            {inactiveReminders.length === 0 ? (
              <div className="rounded-[22px] bg-slate-50 border border-slate-100 px-4 py-5 text-sm text-slate-600 leading-relaxed">
                No inactive reminders right now.
              </div>
            ) : (
              <div className="space-y-3">
                {inactiveReminders.map((item) => {
                  const isBusy = activeMutationId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-[22px] border border-slate-100 px-4 py-4 bg-white"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{item.dosageNote}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={isAnyMutationPending || isBusy}
                          className="rounded-full bg-brand-primary-container/40 px-4 py-2 text-xs font-bold text-brand-on-primary-container hover:brightness-95 transition-all disabled:opacity-60"
                        >
                          {isBusy && updateReminder.isPending ? "Updating..." : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(updateReminder.isError || deleteReminder.isError) ? (
            <div className="rounded-[22px] bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-700 leading-relaxed">
              {updateReminder.error instanceof Error
                ? updateReminder.error.message
                : deleteReminder.error instanceof Error
                  ? deleteReminder.error.message
                  : "Reminder update failed."}
            </div>
          ) : null}
        </div>
      </section>

      <div className="text-xs text-slate-500 leading-relaxed max-w-3xl">
        This page is wired to the backend reminder routes already defined in the
        project: <code>GET /reminders/</code>, <code>POST /reminders/</code>,
        <code>PUT /reminders/{"{id}"}</code>, and <code>DELETE /reminders/{"{id}"}</code>.
      </div>
    </div>
  );
}