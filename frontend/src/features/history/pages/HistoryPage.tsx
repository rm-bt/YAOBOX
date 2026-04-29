import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Pill,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RawRecord = Record<string, unknown>;
type HistoryFilter = "all" | "medicine" | "prescription" | "report";

type HistoryItem = {
  id: string;
  title: string;
  recordType: "medicine" | "prescription" | "report";
  sourceType: string;
  createdAtRaw: string;
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
};

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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
      // ignore malformed storage
    }
  }

  return null;
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
        error instanceof Error ? error : new Error("Unknown history request failure");
    }
  }

  throw lastError ?? new Error("No history endpoint responded successfully.");
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
      objectValue.scan_history,
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeConfidenceLabel(raw: RawRecord): {
  confidenceValue: number | null;
  confidenceLabel: string;
} {
  const confidence = raw.confidence;

  if (typeof confidence === "number") {
    return {
      confidenceValue: confidence,
      confidenceLabel: `${Math.round(confidence * 100)}% confidence`,
    };
  }

  if (confidence && typeof confidence === "object") {
    const obj = confidence as RawRecord;
    if (typeof obj.ocr === "number") {
      return {
        confidenceValue: obj.ocr,
        confidenceLabel: `${Math.round(obj.ocr * 100)}% OCR`,
      };
    }
  }

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

function inferRecordType(raw: RawRecord): "medicine" | "prescription" | "report" {
  const explicit = firstNonEmptyString(
    raw.record_type,
    raw.document_type,
    raw.type,
    raw.sourceType,
    raw.source_type
  ).toLowerCase();

  if (explicit.includes("prescription")) return "prescription";
  if (explicit.includes("report")) return "report";
  if (explicit.includes("barcode")) return "medicine";
  if (explicit.includes("image_upload")) return "medicine";

  const title = firstNonEmptyString(raw.title, raw.name, raw.medicine_name).toLowerCase();
  if (title.includes("prescription")) return "prescription";
  if (title.includes("report")) return "report";

  return "medicine";
}

function normalizeHistoryItem(rawInput: unknown): HistoryItem {
  const raw = (rawInput ?? {}) as RawRecord;
  const medicine = ((raw.medicine as RawRecord | undefined) ?? {}) as RawRecord;
  const confidence = normalizeConfidenceLabel(raw);

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
      ) || "Saved history record",
    recordType: inferRecordType(raw),
    sourceType:
      firstNonEmptyString(raw.sourceType, raw.source_type) || "unknown",
    createdAtRaw: firstNonEmptyString(raw.created_at, raw.createdAt, raw.date),
    createdAtLabel: formatDateLabel(raw.created_at ?? raw.createdAt ?? raw.date),
    confidenceValue: confidence.confidenceValue,
    confidenceLabel: confidence.confidenceLabel,
    translatedSummary:
      firstNonEmptyString(
        raw.translatedSummaryEn,
        raw.translated_summary_en,
        raw.translated_text,
        raw.summary,
        raw.explanation
      ) || "English explanation not available.",
    extractedText:
      firstNonEmptyString(
        raw.extractedTextZh,
        raw.extracted_text_zh,
        raw.raw_text,
        raw.ocr_text,
        raw.original_text
      ) || "Original extracted text not available.",
    dosage:
      firstNonEmptyString(
        raw.dosage,
        medicine.dosage_text,
        medicine.dosageText,
        raw.usage,
        raw.instructions
      ) || "Dosage not extracted clearly.",
    warnings: [
      ...asWarningList(raw.warnings),
      ...asWarningList(raw.warning),
      ...asWarningList(medicine.warnings),
    ].filter(Boolean),
    imageUrl:
      firstNonEmptyString(
        raw.image_url,
        raw.imageUrl,
        raw.imagePreview,
        raw.thumbnail_url
      ) || null,
    barcode:
      firstNonEmptyString(raw.barcode, medicine.barcode) || "Not available",
    matchStatus:
      firstNonEmptyString(raw.match_status, raw.matchStatus, medicine.matchStatus) ||
      "unknown",
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

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => requestJsonFromPaths<unknown>(["/history", "/history/"]),
    retry: false,
    staleTime: 30_000,
  });

  const deleteHistory = useMutation({
    mutationFn: async (scanId: string) =>
      requestJsonFromPaths<unknown>(
        [`/history/${scanId}`, `/history/${scanId}/`],
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setSelectedId(null);
    },
  });

  const historyItems = useMemo(
    () => asArray<RawRecord>(historyQuery.data).map(normalizeHistoryItem),
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
        item.dosage,
        item.sourceType,
        item.matchStatus,
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
              Reopen prior scan results fast. Keep the list skim-friendly, searchable,
              and honest about source and confidence.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
            <ShieldCheck size={16} />
            History should reflect verified data, OCR text, and AI explanation separately.
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
          <div className="text-slate-500 font-medium mt-2">Low-confidence records</div>
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
              The frontend is calling the intended history endpoint, but your running
              backend may not have the route mounted yet, or the session may be invalid.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/scan"
                className="rounded-full bg-brand-secondary px-5 py-3 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
              >
                Go to scan
              </Link>
            </div>
          </div>
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="rounded-[28px] bg-white border border-slate-100 p-8 shadow-sm text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-slate-300" />
          <h2 className="text-2xl font-bold text-slate-900 mt-4">
            No history records found
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto mt-3 leading-relaxed">
            This history view stays useful only when saved scan results exist. Start
            from the scan flow, save a result, then return here.
          </p>
          <div className="mt-6">
            <Link
              to="/scan"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-6 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
            >
              Go to scan
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
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

                      <span className="text-xs text-slate-400 font-semibold">
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
                      {item.translatedSummary}
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
                    <p className="text-slate-500 mt-2">{selectedItem.createdAtLabel}</p>
                  </div>

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

                  <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                      English explanation
                    </p>
                    <p className="text-slate-900 leading-relaxed">
                      {selectedItem.translatedSummary}
                    </p>
                  </div>

                  <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                      Original Chinese text
                    </p>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedItem.extractedText}
                    </p>
                  </div>

                  <div className="rounded-[24px] bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-3">
                      Warnings
                    </p>

                    <div className="space-y-2">
                      {(selectedItem.warnings.length > 0
                        ? selectedItem.warnings
                        : ["No warning text was returned by the backend."]
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
                </div>

                <div className="xl:w-[260px] shrink-0 space-y-3">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                      Confidence
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedItem.confidenceLabel}
                    </p>
                  </div>

                  <Link
                    to="/reminders/create"
                    state={{
                      medicineId: "",
                      medicineName: selectedItem.title,
                      dosageNote: selectedItem.dosage,
                      sourceScanId: selectedItem.id,
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-5 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
                  >
                    Create reminder
                    <ChevronRight className="w-4 h-4" />
                  </Link>

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