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

import {
  createReminder,
  type ReminderCreatePayload,
} from "../../../api/reminders.api";

type ReminderPrefillState = {
  medicineId?: string | number;
  medicineName?: string;
  dosageNote?: string;
  sourceScanId?: string | number;
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

function buildCreatePayload(
  form: ReminderFormState,
  state: ReminderPrefillState
): ReminderCreatePayload {
  const payload: ReminderCreatePayload = {
    reminder_time: form.reminderTime,
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

  const initialMedicineName = firstNonEmptyString(
    state.medicineName,
    "Medication reminder"
  );

  const [form, setForm] = useState<ReminderFormState>({
    medicineId: state.medicineId ? String(state.medicineId) : "",
    medicineName: initialMedicineName,
    reminderTime: "",
    frequency: "daily",
    dosageNote: state.dosageNote ?? "",
    isActive: true,
  });

  const prefillMedicineName = useMemo(
    () => firstNonEmptyString(form.medicineName, "Medication reminder"),
    [form.medicineName]
  );

  const createReminderMutation = useMutation({
    mutationFn: (payload: ReminderCreatePayload) => createReminder(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
      navigate("/reminders", { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.reminderTime) {
      return;
    }

    createReminderMutation.reset();
    createReminderMutation.mutate(buildCreatePayload(form, state));
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
          Set one reminder from a scan result or create one manually.
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

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <AlarmClock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Flow note</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This page now uses the shared authenticated reminder API. No duplicate
              token handling. No private fetch logic. Much less fragile.
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
              <h2 className="text-xl font-bold text-slate-900">
                Reminder details
              </h2>
              <p className="text-sm text-slate-500">
                Set time, frequency, note, and activation state.
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

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={createReminderMutation.isPending}
                className="rounded-full bg-brand-secondary px-6 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 transition-all hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createReminderMutation.isPending ? "Creating..." : "Create reminder"}
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