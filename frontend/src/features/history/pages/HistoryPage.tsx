import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  Loader2,
  Pill,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { env } from "../../../app/config/env";
import {
  deleteHistoryItem,
  getHistory,
  type ScanHistoryItem,
} from "../../../api/history.api";

type HistoryFilter = "all" | "medicine" | "prescription" | "report";

type HistoryItem = {
  id: string;
  title: string;
  recordType: "medicine" | "prescription" | "report";
  sourceType: string;
  createdAtLabel: string;
  confidenceValue: number | null;
  confidenceLabel: string;
  translatedSummary: string;
  extractedText: string;
  dosage: string;
  warnings: string[];
  imageUrl: string | null;
  barcode: string;
  matchStatus: string;
  trustNotes: string;
};

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function cleanPreviewText(value: string): string {
  if (!value.trim()) return "Preview unavailable.";

  return value
    .replace(/English Translation:/gi, "")
    .replace(/Simple Explanation:/gi, "")
    .replace(/Safety Note:/gi, "")
    .replace(/Trust:/gi, "")
    .replace(/Medicine:/gi, "")
    .replace(/Manufacturer:/gi, "")
    .replace(/Warnings:/gi, "")
    .replace(/Dosage:/gi, "")
    .replace(/Usage:/gi, "")
    .replace(/Ingredients:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEnglishReminderNote(value: unknown): string {
  const raw = firstNonEmptyString(value);

  if (!raw) return "";

  if (!containsChinese(raw)) return raw;

  return "Follow the medicine label or doctor/pharmacist instructions. Dosage may vary by product specification and manufacturer.";
}

function asWarningList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  const single = firstNonEmptyString(value);
  return single ? [single] : [];
}

function formatDateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildImageUrl(rawPath: unknown): string | null {
  const imagePath = firstNonEmptyString(rawPath);

  if (!imagePath || imagePath === "null") return null;

  const normalized = imagePath.replace(/\\/g, "/");

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${env.apiBaseUrl}${normalized}`;
  }

  return `${env.apiBaseUrl}/${normalized}`;
}

function normalizeConfidenceLabel(raw: ScanHistoryItem): {
  confidenceValue: number | null;
  confidenceLabel: string;
} {
  if (typeof raw.ocr_confidence === "number") {
    return {
      confidenceValue: raw.ocr_confidence,
      confidenceLabel: `${Math.round(raw.ocr_confidence * 100)}% OCR`,
    };
  }

  return {
    confidenceValue: null,
    confidenceLabel: "Confidence pending",
  };
}

function inferRecordType(
  raw: ScanHistoryItem
): "medicine" | "prescription" | "report" {
  const sourceType = firstNonEmptyString(raw.source_type).toLowerCase();
  const title = firstNonEmptyString(raw.medicine_name).toLowerCase();

  if (sourceType.includes("prescription")) return "prescription";
  if (sourceType.includes("report")) return "report";
  if (title.includes("prescription")) return "prescription";
  if (title.includes("report")) return "report";

  return "medicine";
}

function normalizeHistoryItem(raw: ScanHistoryItem): HistoryItem {
  const confidence = normalizeConfidenceLabel(raw);

  return {
    id: String(raw.id),
    title:
      firstNonEmptyString(
        raw.medicine_name,
        raw.barcode ? `Barcode ${raw.barcode}` : ""
      ) || "Saved history record",
    recordType: inferRecordType(raw),
    sourceType: firstNonEmptyString(raw.source_type) || "unknown",
    createdAtLabel: formatDateLabel(raw.created_at),
    confidenceValue: confidence.confidenceValue,
    confidenceLabel: confidence.confidenceLabel,
    translatedSummary:
      firstNonEmptyString(raw.translated_text, raw.usage) ||
      "Machine translation not available.",
    extractedText:
      firstNonEmptyString(raw.raw_ocr_text, raw.raw_text) ||
      "Original OCR text not available.",
    dosage:
      firstNonEmptyString(raw.dosage, raw.usage) ||
      "Dosage not extracted clearly.",
    warnings: asWarningList(raw.warnings),
    imageUrl: buildImageUrl(raw.image_url || raw.image_path),
    barcode: firstNonEmptyString(raw.barcode) || "Not available",
    matchStatus: firstNonEmptyString(raw.match_status) || "unknown",
    trustNotes:
      firstNonEmptyString(raw.trust_notes) ||
      "No technical trust details were returned.",
  };
}

function typeLabel(recordType: HistoryItem["recordType"]): string {
  if (recordType === "prescription") return "Prescription";
  if (recordType === "report") return "Report";
  return "Medicine";
}

function typeChipClass(recordType: HistoryItem["recordType"]): string {
  if (recordType === "prescription") {
    return "bg-brand-primary-container/50 text-brand-on-primary-container";
  }

  if (recordType === "report") {
    return "bg-brand-tertiary-container/40 text-brand-tertiary";
  }

  return "bg-slate-100 text-slate-700";
}

function previewIcon(recordType: HistoryItem["recordType"]) {
  if (recordType === "prescription" || recordType === "report") {
    return <FileText className="w-8 h-8 text-brand-secondary" />;
  }

  return <Pill className="w-8 h-8 text-brand-secondary -rotate-45" />;
}

function historyPreview(item: HistoryItem): string {
  const limit =
    item.recordType === "prescription" || item.recordType === "report"
      ? 180
      : 140;

  return cleanPreviewText(item.translatedSummary).slice(0, limit);
}

function userFacingTrustNote(item: HistoryItem): string {
  if (item.recordType === "medicine") {
    return "Medicine scan with OCR, catalogue matching, and translation support.";
  }

  if (item.recordType === "prescription") {
    return "Prescription OCR and machine translation result. Verify important details before use.";
  }

  return "Medical report OCR and machine translation result. This is not a diagnosis.";
}

function explanationTitle(item: HistoryItem): string {
  return item.recordType === "medicine"
    ? "English explanation"
    : "Machine translation";
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: getHistory,
    retry: false,
    staleTime: 30_000,
  });

  const deleteHistory = useMutation({
    mutationFn: deleteHistoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setSelectedId(null);
    },
  });

  const historyItems = useMemo(
    () => (historyQuery.data ?? []).map(normalizeHistoryItem),
    [historyQuery.data]
  );

  useEffect(() => {
    if (!selectedId && historyItems.length > 0) {
      setSelectedId(historyItems[0].id);
    }
  }, [historyItems, selectedId]);

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return historyItems.filter((item) => {
      const filterMatch =
        activeFilter === "all" ? true : item.recordType === activeFilter;

      if (!filterMatch) return false;
      if (!query) return true;

      return [
        item.title,
        item.translatedSummary,
        item.extractedText,
        item.dosage,
        item.sourceType,
        item.matchStatus,
        item.trustNotes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [historyItems, activeFilter, searchText]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ??
    historyItems.find((item) => item.id === selectedId) ??
    null;

  const lowConfidenceCount = historyItems.filter(
    (item) => item.confidenceValue !== null && item.confidenceValue < 0.7
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-6">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          History
        </p>

        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              Scan history
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl leading-relaxed mt-3">
              Review saved medicine scans, translated documents, OCR confidence,
              and reminder-ready results.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
            <ShieldCheck size={16} />
            Saved OCR and translation records
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">
            {historyQuery.isLoading ? "..." : String(historyItems.length)}
          </div>
          <div className="text-slate-500 font-medium mt-2">Saved records</div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">
            {historyQuery.isLoading ? "..." : String(filteredItems.length)}
          </div>
          <div className="text-slate-500 font-medium mt-2">Filtered results</div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">
            {historyQuery.isLoading ? "..." : String(lowConfidenceCount)}
          </div>
          <div className="text-slate-500 font-medium mt-2">
            Needs manual review
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[32px] border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 w-full lg:max-w-md rounded-full bg-slate-50 border border-slate-200 px-4 py-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search history..."
              className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="bg-slate-50 p-1 rounded-full flex flex-wrap gap-1 w-fit border border-slate-200">
            {[
              ["all", "All"],
              ["medicine", "Medicines"],
              ["prescription", "Prescriptions"],
              ["report", "Reports"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveFilter(value as HistoryFilter)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === value
                    ? "bg-white text-brand-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {historyQuery.isLoading ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-44 rounded-[28px] bg-white border border-slate-100 shadow-sm animate-pulse"
            />
          ))}
        </section>
      ) : historyQuery.isError ? (
        <section className="rounded-[28px] bg-amber-50 border border-amber-100 p-5 flex items-start gap-3 text-amber-800">
          <TriangleAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold">History could not be loaded.</p>
            <p className="text-sm leading-relaxed">
              Check that you are logged in and that the backend is running.
            </p>
            <Link
              to="/scan"
              className="inline-flex rounded-full bg-brand-secondary px-5 py-3 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
            >
              Go to scan
            </Link>
          </div>
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <Search className="w-7 h-7 text-slate-400" />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            No matching history records
          </h3>

          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            Try another keyword or create a new medicine scan, prescription OCR,
            or report OCR record.
          </p>

          <Link
            to="/scan"
            className="inline-flex items-center gap-2 mt-8 rounded-full bg-brand-primary text-white px-6 py-3 font-semibold hover:brightness-105 transition-all"
          >
            Create New Scan
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ y: -3 }}
                onClick={() => setSelectedId(item.id)}
                className={`text-left rounded-[28px] border p-5 bg-white shadow-sm transition-all ${
                  selectedId === item.id
                    ? "border-brand-primary-container ring-2 ring-brand-primary-container/40"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-[18px] bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      previewIcon(item.recordType)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${typeChipClass(
                          item.recordType
                        )}`}
                      >
                        {typeLabel(item.recordType)}
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          item.confidenceValue !== null &&
                          item.confidenceValue < 0.7
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {item.confidenceLabel}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-3 line-clamp-1">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-1 mt-2 text-slate-500 text-sm">
                      <CalendarDays className="w-4 h-4" />
                      <span>{item.createdAtLabel}</span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {historyPreview(item)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </section>

          {selectedItem ? (
            <section className="bg-white rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${typeChipClass(
                        selectedItem.recordType
                      )}`}
                    >
                      {typeLabel(selectedItem.recordType)}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                      {selectedItem.sourceType}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                      {selectedItem.matchStatus}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">
                      {selectedItem.title}
                    </h2>
                    <p className="text-slate-500 mt-2">
                      {selectedItem.createdAtLabel}
                    </p>
                  </div>

                  <div className="rounded-[24px] bg-emerald-50 border border-emerald-100 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 mb-2">
                      Review note
                    </p>
                    <p className="text-emerald-900 leading-relaxed text-sm">
                      {userFacingTrustNote(selectedItem)}
                    </p>
                  </div>

                  {selectedItem.recordType === "medicine" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                          Dosage
                        </p>
                        <p className="text-slate-900 leading-relaxed">
                          {selectedItem.dosage}
                        </p>
                      </div>

                      <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                          Barcode
                        </p>
                        <p className="text-slate-900 leading-relaxed">
                          {selectedItem.barcode}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                      {explanationTitle(selectedItem)}
                    </p>
                    <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {selectedItem.translatedSummary}
                    </p>
                  </div>

                  <details className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900">
                      Show original OCR text
                    </summary>
                    <p className="mt-4 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedItem.extractedText}
                    </p>
                  </details>

                  <details className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900">
                      Show technical trust details
                    </summary>
                    <p className="mt-4 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                      {selectedItem.trustNotes}
                    </p>
                  </details>

                  {selectedItem.recordType === "medicine" ? (
                    <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-3">
                        Warnings
                      </p>

                      <div className="space-y-2">
                        {(selectedItem.warnings.length > 0
                          ? selectedItem.warnings
                          : ["No warning text was returned by the scan."]
                        ).map((warning) => (
                          <div
                            key={warning}
                            className="rounded-[18px] bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900"
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="xl:w-[260px] shrink-0 space-y-3">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                      Confidence
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        selectedItem.confidenceValue !== null &&
                        selectedItem.confidenceValue < 0.7
                          ? "text-amber-600"
                          : "text-slate-900"
                      }`}
                    >
                      {selectedItem.confidenceLabel}
                    </p>
                  </div>

                  {selectedItem.recordType === "medicine" ? (
                    <Link
                      to="/reminders/create"
                      state={{
                        medicineId: "",
                        medicineName: selectedItem.title,
                        dosageNote: buildEnglishReminderNote(
                          selectedItem.dosage
                        ),
                        sourceScanId: selectedItem.id,
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-5 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
                    >
                      Create reminder
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => deleteHistory.mutate(selectedItem.id)}
                    disabled={deleteHistory.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-5 py-3.5 text-red-700 font-bold hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    {deleteHistory.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete record
                  </button>

                  {deleteHistory.isError ? (
                    <div className="rounded-[20px] bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-700 leading-relaxed">
                      {deleteHistory.error instanceof Error
                        ? deleteHistory.error.message
                        : "Delete failed."}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}