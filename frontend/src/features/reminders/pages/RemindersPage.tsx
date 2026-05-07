import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useReminderNotifications } from "../hooks/useReminderNotifications";
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

import {
  createReminder,
  deleteReminder,
  getReminders,
  updateReminder,
  type ReminderCreatePayload,
  type ReminderItem,
} from "../../../api/reminders.api";

type NormalizedReminder = {
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
  medicineName: string;
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

function toReminderIsoDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
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

function normalizeReminder(raw: ReminderItem): NormalizedReminder {
  const reminderTimeRaw = firstNonEmptyString(raw.reminder_time);

  const medicineId =
    typeof raw.medicine_id === "number"
      ? String(raw.medicine_id)
      : firstNonEmptyString(raw.medicine_id);

  return {
    id: String(raw.id),
    title: firstNonEmptyString(raw.medicine_name) || "Medication reminder",
    medicineId,
    reminderTimeRaw,
    reminderTimeText: formatTimeLabel(reminderTimeRaw),
    frequency: firstNonEmptyString(raw.frequency) || "daily",
    dosageNote: firstNonEmptyString(raw.dosage_note) || "No dosage note",
    isActive: Boolean(raw.is_active ?? true),
  };
}

function buildCreatePayload(form: ReminderFormState): ReminderCreatePayload {
  const payload: ReminderCreatePayload = {
    reminder_time: toReminderIsoDateTime(form.reminderTime),
    frequency: form.frequency,
    dosage_note: form.dosageNote.trim() || null,
    is_active: form.isActive,
  };

  const cleanMedicineId = form.medicineId.trim();
  const cleanMedicineName = form.medicineName.trim();

  if (cleanMedicineId) {
    payload.medicine_id = cleanMedicineId;
  }

  if (cleanMedicineName) {
    payload.medicine_name = cleanMedicineName;
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
    <div
      className={`w-14 h-14 ${colorClass} rounded-full flex items-center justify-center`}
    >
      {icon}
    </div>
    <div>
      <div className="text-3xl font-bold text-slate-900 leading-none">
        {value}
      </div>
      <div className="text-slate-500 font-medium mt-2">{label}</div>
    </div>
  </motion.div>
);

export default function RemindersPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ReminderFormState>({
    medicineId: "",
    medicineName: "",
    reminderTime: "",
    frequency: "daily",
    dosageNote: "",
    isActive: true,
  });

  const [activeMutationId, setActiveMutationId] = useState<string | null>(null);

  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: getReminders,
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createReminderMutation = useMutation({
    mutationFn: createReminder,
    onMutate: () => {
      setActiveMutationId("create");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setForm({
        medicineId: "",
        medicineName: "",
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

  const updateReminderMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ReminderCreatePayload;
    }) => updateReminder(id, payload),
    onMutate: ({ id }) => {
      setActiveMutationId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onSettled: () => {
      setActiveMutationId(null);
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteReminder,
    onMutate: (id) => {
      setActiveMutationId(String(id));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onSettled: () => {
      setActiveMutationId(null);
    },
  });

  const reminders = useMemo(
    () => (remindersQuery.data ?? []).map(normalizeReminder),
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

  const reminderNotifications = useReminderNotifications(activeReminders);

  const isAnyMutationPending =
    createReminderMutation.isPending ||
    updateReminderMutation.isPending ||
    deleteReminderMutation.isPending;

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.reminderTime) {
      return;
    }

    createReminderMutation.reset();
    updateReminderMutation.reset();
    deleteReminderMutation.reset();

    createReminderMutation.mutate(buildCreatePayload(form));
  }

  function handleToggleActive(item: NormalizedReminder) {
    const freshItem = reminderById.get(item.id);

    if (!freshItem || isAnyMutationPending) {
      return;
    }

    createReminderMutation.reset();
    updateReminderMutation.reset();
    deleteReminderMutation.reset();

    updateReminderMutation.mutate({
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

    createReminderMutation.reset();
    updateReminderMutation.reset();
    deleteReminderMutation.reset();

    deleteReminderMutation.mutate(itemId);
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
          Keep reminder setup simple. Create, review, activate, and remove schedules
          without turning reminders into a fake clinical system.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Reminders support medication management. They do not replace medical advice.
        </div>

        <div className="rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Browser reminder notifications
            </p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              {reminderNotifications.supported
                ? reminderNotifications.enabled
                  ? `Notifications are enabled. Watching ${reminderNotifications.activeReminderCount} active reminder(s).`
                  : reminderNotifications.permission === "denied"
                    ? "Notifications are blocked in this browser. Enable them from browser site settings."
                    : "Enable notifications so YAOBOX can alert you while the app is open."
                : "This browser does not support notification alerts."}
            </p>

            {reminderNotifications.lastNotificationLabel ? (
              <p className="text-xs text-brand-primary font-semibold mt-2">
                Last notification: {reminderNotifications.lastNotificationLabel}
              </p>
            ) : null}
          </div>

          {reminderNotifications.supported && !reminderNotifications.enabled ? (
            <button
              type="button"
              onClick={() => {
                void reminderNotifications.requestPermission();
              }}
              className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
            >
              Enable notifications
            </button>
          ) : null}
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
              <h2 className="text-xl font-bold text-slate-900">
                Create reminder
              </h2>
              <p className="text-sm text-slate-500">
                Saved through the shared backend reminder API.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Medicine name
              </label>
              <input
                type="text"
                value={form.medicineName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medicineName: event.target.value,
                  }))
                }
                placeholder="Medicine name"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">
                Medicine ID optional
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
                placeholder="Leave blank unless linked to catalog"
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

            {createReminderMutation.isError ? (
              <div className="rounded-[20px] bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-700 leading-relaxed whitespace-pre-wrap break-words">
                {createReminderMutation.error instanceof Error
                  ? createReminderMutation.error.message
                  : "Reminder creation failed."}
              </div>
            ) : null}

            {createReminderMutation.isSuccess ? (
              <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 px-4 py-4 text-sm text-emerald-700 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Reminder created successfully.</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={createReminderMutation.isPending || isAnyMutationPending}
              className="w-full rounded-full bg-brand-secondary px-6 py-4 text-white font-bold shadow-lg shadow-brand-secondary/20 transition-all hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createReminderMutation.isPending
                ? "Creating reminder..."
                : "Create reminder"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Active reminders
                </h2>
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
                <div>Reminder data could not be loaded from the backend.</div>
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
                            <p className="font-bold text-slate-900 text-lg">
                              {item.title}
                            </p>
                            <span className="rounded-full bg-brand-primary-container/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-on-primary-container">
                              {item.frequency}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {item.dosageNote}
                          </p>

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
                            {isBusy && updateReminderMutation.isPending
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
                            {isBusy && deleteReminderMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
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
                <h2 className="text-xl font-bold text-slate-900">
                  Inactive reminders
                </h2>
                <p className="text-sm text-slate-500">
                  Disabled reminders stay visible so users understand their state.
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
                          <p className="font-bold text-slate-900">
                            {item.title}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {item.dosageNote}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={isAnyMutationPending || isBusy}
                          className="rounded-full bg-brand-primary-container/40 px-4 py-2 text-xs font-bold text-brand-on-primary-container hover:brightness-95 transition-all disabled:opacity-60"
                        >
                          {isBusy && updateReminderMutation.isPending
                            ? "Updating..."
                            : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {updateReminderMutation.isError || deleteReminderMutation.isError ? (
            <div className="rounded-[22px] bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-700 leading-relaxed">
              {updateReminderMutation.error instanceof Error
                ? updateReminderMutation.error.message
                : deleteReminderMutation.error instanceof Error
                  ? deleteReminderMutation.error.message
                  : "Reminder update failed."}
            </div>
          ) : null}
        </div>
      </section>

      <div className="text-xs text-slate-500 leading-relaxed max-w-3xl">
        This page is wired through the shared reminder API wrapper:
        <code> GET /reminders/</code>, <code>POST /reminders/</code>,
        <code> PUT /reminders/{"{id}"}</code>, and
        <code> DELETE /reminders/{"{id}"}</code>.
      </div>
    </div>
  );
}