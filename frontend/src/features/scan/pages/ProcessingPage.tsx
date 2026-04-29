import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ScanLine,
} from "lucide-react";

type ProcessingLocationState = {
  fileName?: string;
  sourceType?: string;
  currentStep?: number;
  steps?: string[];
  startedAt?: string;
  error?: string;
};

const DEFAULT_STEPS = [
  "Uploading input",
  "Running OCR extraction",
  "Generating English explanation",
  "Preparing structured result",
] as const;

export default function ProcessingPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as ProcessingLocationState;

  const steps = state.steps && state.steps.length > 0 ? state.steps : [...DEFAULT_STEPS];
  const currentStep = Math.min(
    Math.max(state.currentStep ?? 1, 0),
    steps.length - 1
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Processing
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Working on your scan
        </h1>

        <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
          This page should reassure the user during OCR and AI work without fake
          progress. Keep the state honest and readable.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <Clock3 size={16} />
          Current source: {state.sourceType ?? "image upload"}
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="bg-white rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-brand-primary-container/40 text-brand-on-primary-container flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                OCR and AI processing in progress
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {state.fileName
                  ? `Input: ${state.fileName}`
                  : "Your submitted input is being processed."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;

              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-[24px] border px-5 py-4 flex items-center gap-4 ${
                    isActive
                      ? "border-brand-primary-container bg-brand-primary-container/20"
                      : isDone
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-white text-brand-on-primary-container"
                        : isDone
                          ? "bg-white text-emerald-600"
                          : "bg-white text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ScanLine className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{step}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {isActive ? "Current step" : isDone ? "Completed" : "Pending"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {state.error ? (
            <div className="mt-6 rounded-[24px] bg-red-50 border border-red-100 p-4 flex items-start gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm leading-relaxed">{state.error}</div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              If this takes too long
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Do not leave the user guessing. Provide a retry path and a clear
              way back to scan.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/scan"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-5 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry scan
              </Link>

              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Trust note</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Processing states must stay honest. No fake 100% bars unless the
              backend truly reports detailed progress.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}