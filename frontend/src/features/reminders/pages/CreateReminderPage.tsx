import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pill,
  Plus,
  ShieldCheck,
} from "lucide-react";

import {
  createReminder,
  type ReminderCreatePayload,
} from "../../../api/reminders.api";

type ReminderFrequency = "once" | "daily" | "twice_daily" | "weekly";

type ReminderPrefillState = {
  medicineId?: string | number;
  medicineName?: string;
  dosageNote?: string;
  sourceScanId?: string | number;
};

type ReminderFormState = {
  medicineId: string;
  medicineName: string;
  frequency: ReminderFrequency;
  onceDate: string;
  primaryTime: string;
  secondaryTime: string;
  weeklyDay: string;
  dosageNote: string;
  isActive: boolean;
};

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}
function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function buildEnglishDosageNote(value: unknown): string {
  const raw = firstNonEmptyString(value);

  if (!raw) {
    return "";
  }

  if (!containsChinese(raw)) {
    return raw;
  }

  return "Follow the medicine label or doctor/pharmacist instructions. Dosage may vary by product specification and manufacturer.";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function todayInputDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function localDateTimeToIso(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.toISOString();
}

function nextDateForTime(timeValue: string): string {
  const now = new Date();
  const [hour, minute] = timeValue.split(":").map(Number);

  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate.toISOString();
}

function nextDateForWeekday(dayValue: string, timeValue: string): string {
  const now = new Date();
  const targetDay = Number(dayValue);
  const [hour, minute] = timeValue.split(":").map(Number);

  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  const currentDay = candidate.getDay();
  let daysToAdd = targetDay - currentDay;

  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  if (daysToAdd === 0 && candidate.getTime() <= now.getTime()) {
    daysToAdd = 7;
  }

  candidate.setDate(candidate.getDate() + daysToAdd);
  return candidate.toISOString();
}

function basePayload(
  form: ReminderFormState,
  state: ReminderPrefillState
): Omit<ReminderCreatePayload, "reminder_time" | "frequency"> {
  const payload: Omit<ReminderCreatePayload, "reminder_time" | "frequency"> = {
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

  if (state.sourceScanId !== undefined && state.sourceScanId !== null) {
    const numericScanId = Number(state.sourceScanId);

    if (!Number.isNaN(numericScanId)) {
      payload.scan_id = numericScanId;
    }
  }

  return payload;
}

function buildCreatePayloads(
  form: ReminderFormState,
  state: ReminderPrefillState
): ReminderCreatePayload[] {
  const shared = basePayload(form, state);

  if (form.frequency === "once") {
    return [
      {
        ...shared,
        reminder_time: localDateTimeToIso(form.onceDate, form.primaryTime),
        frequency: "once",
      },
    ];
  }

  if (form.frequency === "daily") {
    return [
      {
        ...shared,
        reminder_time: nextDateForTime(form.primaryTime),
        frequency: "daily",
      },
    ];
  }

  if (form.frequency === "twice_daily") {
    return [
      {
        ...shared,
        reminder_time: nextDateForTime(form.primaryTime),
        frequency: "twice_daily_first",
        dosage_note:
          form.dosageNote.trim() ||
          "First daily reminder. Follow the medicine label or doctor/pharmacist instructions.",
      },
      {
        ...shared,
        reminder_time: nextDateForTime(form.secondaryTime),
        frequency: "twice_daily_second",
        dosage_note:
          form.dosageNote.trim() ||
          "Second daily reminder. Follow the medicine label or doctor/pharmacist instructions.",
      },
    ];
  }

  const selectedDay =
    WEEKDAYS.find((item) => item.value === form.weeklyDay)?.label.toLowerCase() ??
    "weekly";

  return [
    {
      ...shared,
      reminder_time: nextDateForWeekday(form.weeklyDay, form.primaryTime),
      frequency: `weekly_${selectedDay}`,
    },
  ];
}

function validateForm(form: ReminderFormState): string {
  if (!form.medicineName.trim()) {
    return "Medicine name is required.";
  }

  if (form.frequency === "once" && !form.onceDate) {
    return "Choose a date for the one-time reminder.";
  }

  if (!form.primaryTime) {
    return "Choose a reminder time.";
  }

  if (form.frequency === "twice_daily" && !form.secondaryTime) {
    return "Choose the second reminder time.";
  }

  if (
    form.frequency === "twice_daily" &&
    form.primaryTime &&
    form.secondaryTime &&
    form.primaryTime === form.secondaryTime
  ) {
    return "The two reminder times must be different.";
  }

  return "";
}

function ScheduleSummary({
  frequency,
}: {
  frequency: ReminderFrequency;
}) {
  const copy: Record<ReminderFrequency, { title: string; text: string }> = {
    once: {
      title: "One-time reminder",
      text: "Uses one exact date and time.",
    },
    daily: {
      title: "Daily reminder",
      text: "Uses one time. The first reminder is scheduled for the next occurrence.",
    },
    twice_daily: {
      title: "Twice daily",
      text: "Creates two reminder records so the current backend can handle two daily alerts honestly.",
    },
    weekly: {
      title: "Weekly reminder",
      text: "Uses one weekday and one time. The first reminder is scheduled for the next matching day.",
    },
  };

  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4">
      <p className="font-bold text-slate-900">{copy[frequency].title}</p>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
        {copy[frequency].text}
      </p>
    </div>
  );
}

function SmallInfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}

export default function CreateReminderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const state = (location.state ?? {}) as ReminderPrefillState;

  const initialMedicineName = firstNonEmptyString(
    state.medicineName,
    "Medication reminder"
  );

  const [form, setForm] = useState<ReminderFormState>({
    medicineId: state.medicineId ? String(state.medicineId) : "",
    medicineName: initialMedicineName,
    frequency: "daily",
    onceDate: todayInputDate(),
    primaryTime: "",
    secondaryTime: "",
    weeklyDay: String(new Date().getDay()),
    dosageNote: buildEnglishDosageNote(state.dosageNote),
    isActive: true,
  });

  const [formError, setFormError] = useState("");

  const prefillMedicineName = useMemo(
    () => firstNonEmptyString(form.medicineName, "Medication reminder"),
    [form.medicineName]
  );

  const createReminderMutation = useMutation({
    mutationFn: async (payloads: ReminderCreatePayload[]) => {
      const created = [];

      for (const payload of payloads) {
        created.push(await createReminder(payload));
      }

      return created;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      navigate("/reminders", { replace: true });
    },
  });

  function handleFrequencyChange(nextFrequency: ReminderFrequency) {
    setForm((current) => ({
      ...current,
      frequency: nextFrequency,
      onceDate: current.onceDate || todayInputDate(),
      secondaryTime:
        nextFrequency === "twice_daily" ? current.secondaryTime : "",
    }));

    setFormError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    createReminderMutation.reset();
    setFormError("");
    createReminderMutation.mutate(buildCreatePayloads(form, state));
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
          Create a reminder from a scan result or manually. Frequency now changes
          the fields instead of pretending one calendar input works for every
          schedule.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Reminders support adherence. They do not replace medical advice.
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
                  Prefilled from scan or history when available.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 border border-slate-100 px-5 py-5">
              <p className="font-bold text-slate-900 text-lg">
                {prefillMedicineName}
              </p>

              {state.sourceScanId ? (
                <p className="text-sm text-slate-500 mt-2">
                  Source scan: {state.sourceScanId}
                </p>
              ) : null}

              {form.dosageNote ? (
                <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    Suggested note:
                  </span>{" "}
                  {form.dosageNote}
                </div>
              ) : null}
            </div>
          </div>

          <SmallInfoCard
            icon={<AlarmClock className="w-5 h-5" />}
            title="Schedule model"
            text="The backend stores one concrete reminder datetime per row. Twice daily creates two rows instead of pretending the backend has a full recurrence engine."
          />

          <SmallInfoCard
            icon={<CalendarDays className="w-5 h-5" />}
            title="Notification limit"
            text="Browser notifications only work when permission is enabled and the app is open. Important medication decisions still require a doctor or pharmacist."
          />
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
              <h2 className="text-xl font-bold text-slate-900">
                Reminder details
              </h2>
              <p className="text-sm text-slate-500">
                Set schedule, note, and activation state.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(event) =>
                  handleFrequencyChange(event.target.value as ReminderFrequency)
                }
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              >
                <option value="once">One time</option>
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <ScheduleSummary frequency={form.frequency} />

            {form.frequency === "once" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.onceDate}
                    min={todayInputDate()}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        onceDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.primaryTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        primaryTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>
              </div>
            ) : null}

            {form.frequency === "daily" ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Daily time
                </label>
                <input
                  type="time"
                  value={form.primaryTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      primaryTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                />
                <p className="text-xs text-slate-500">
                  The first reminder will be scheduled for the next occurrence of
                  this time.
                </p>
              </div>
            ) : null}

            {form.frequency === "twice_daily" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    First daily time
                  </label>
                  <input
                    type="time"
                    value={form.primaryTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        primaryTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Second daily time
                  </label>
                  <input
                    type="time"
                    value={form.secondaryTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        secondaryTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>

                <p className="sm:col-span-2 text-xs text-slate-500">
                  This creates two reminder records in the current MVP.
                </p>
              </div>
            ) : null}

            {form.frequency === "weekly" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Weekday
                  </label>
                  <select
                    value={form.weeklyDay}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        weeklyDay: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.primaryTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        primaryTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
                  />
                </div>

                <p className="sm:col-span-2 text-xs text-slate-500">
                  The first reminder will be scheduled for the next selected
                  weekday and time.
                </p>
              </div>
            ) : null}

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

            {formError ? (
              <div className="rounded-[20px] bg-amber-50 border border-amber-100 px-4 py-4 text-sm text-amber-800 leading-relaxed">
                {formError}
              </div>
            ) : null}

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
                <span>
                  Reminder created successfully. Twice daily creates two reminders.
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={createReminderMutation.isPending}
                className="rounded-full bg-brand-secondary px-6 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 transition-all hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createReminderMutation.isPending
                  ? "Creating..."
                  : form.frequency === "twice_daily"
                    ? "Create two reminders"
                    : "Create reminder"}
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