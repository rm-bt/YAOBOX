import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  FileText,
  Pill,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RawResult = Record<string, unknown>;

type NormalizedResult = {
  scanId: string;
  sourceType: string;
  sourceLabel: string;
  confidenceValue: number | null;
  confidenceLabel: string | null;
  medicineName: string;
  medicineNameZh: string;
  matchStatus: string;
  ocrStatus: string;
  aiStatus: string;
  trustNotes: string;
  barcode: string;
  dosage: string;
  usage: string;
  manufacturer: string;
  translatedSummary: string;
  extractedText: string;
  warnings: string[];
  createdAtLabel: string;
  imagePreview: string | null;
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

function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function extractChinesePreview(rawText: string): string {
  if (!rawText) return "";

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const chineseLine = lines.find(containsChinese);
  return chineseLine ?? "";
}

function humanizeSourceType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "barcode") return "Barcode";
  if (normalized === "image_upload") return "Image Upload";
  if (normalized === "manual_entry") return "Manual Entry";
  if (normalized === "prescription") return "Prescription";
  if (normalized === "prescription_upload") return "Prescription Upload";
  if (normalized === "report") return "Report";

  return value.replace(/_/g, " ") || "Scan";
}

function humanizeMatchStatus(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "unknown") return "Unknown";
  if (normalized === "identified") return "Identified";
  if (normalized === "verified") return "Verified catalog";
  if (normalized === "catalog_unverified") return "Catalog match, unverified";
  if (normalized === "probable") return "Probable";
  if (normalized === "saved") return "Saved";
  if (normalized === "ocr_extracted") return "OCR extracted";
  if (normalized === "barcode_unknown") return "Barcode not matched";
  if (normalized === "manual") return "Manual entry";

  return value.replace(/_/g, " ");
}

function humanizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return "Not available";
  if (normalized === "succeeded") return "Succeeded";
  if (normalized === "partial") return "Partial";
  if (normalized === "empty") return "No text found";
  if (normalized === "failed") return "Failed";
  if (normalized === "fallback") return "Fallback";
  if (normalized === "skipped") return "Skipped";
  if (normalized === "not_applicable") return "Not applicable";

  return value.replace(/_/g, " ");
}

function buildImageUrl(raw: RawResult): string | null {
  const direct =
    firstNonEmptyString(raw.image_url, raw.imageUrl, raw.imagePreview) || null;

  if (direct) {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return direct;
    }

    if (direct.startsWith("/")) {
      return `${API_BASE_URL}${direct}`;
    }

    return `${API_BASE_URL}/${direct}`;
  }

  const imagePath = firstNonEmptyString(raw.image_path, raw.imagePath);
  if (!imagePath || imagePath === "null") return null;

  const normalized = imagePath.replace(/\\/g, "/");

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return `${API_BASE_URL}/${normalized}`;
}

function normalizeConfidence(
  raw: RawResult,
  sourceType: string
): { confidenceValue: number | null; confidenceLabel: string | null } {
  const confidence = raw.confidence;

  if (typeof confidence === "number") {
    return {
      confidenceValue: confidence,
      confidenceLabel: `${Math.round(confidence * 100)}% confidence`,
    };
  }

  if (confidence && typeof confidence === "object") {
    const obj = confidence as RawResult;

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

  if (sourceType === "barcode") {
    return {
      confidenceValue: null,
      confidenceLabel: "Barcode lookup",
    };
  }

  return {
    confidenceValue: null,
    confidenceLabel: null,
  };
}

function normalizeResult(input: unknown): NormalizedResult | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as RawResult;
  const medicine = ((raw.medicine as RawResult | undefined) ?? {}) as RawResult;

  const barcode = firstNonEmptyString(
    raw.barcode,
    raw.bar_code,
    medicine.barcode
  );

  const sourceType =
    firstNonEmptyString(raw.sourceType, raw.source_type) ||
    (barcode &&
    !firstNonEmptyString(
      raw.image_path,
      raw.imagePath,
      raw.image_url,
      raw.imageUrl
    )
      ? "barcode"
      : "image_upload");

  const confidence = normalizeConfidence(raw, sourceType);

  const warnings = [
    ...asWarningList(raw.warnings),
    ...asWarningList(raw.warning),
    ...asWarningList(medicine.warnings),
  ];

  const rawText = firstNonEmptyString(
    raw.extractedText,
    raw.extractedTextZh,
    raw.extracted_text_zh,
    raw.raw_text,
    raw.raw_ocr_text,
    raw.ocr_text,
    raw.original_text
  );

  const chinesePreview = extractChinesePreview(rawText);

  const medicineName = firstNonEmptyString(
    raw.medicineName,
    raw.medicine_name,
    medicine.nameEn,
    medicine.name_en,
    raw.title,
    raw.name,
    barcode ? `Barcode ${barcode}` : "",
    chinesePreview
  );

  return {
    scanId: String(raw.scanId ?? raw.scan_id ?? raw.id ?? "unknown"),
    sourceType,
    sourceLabel: humanizeSourceType(sourceType),
    confidenceValue: confidence.confidenceValue,
    confidenceLabel: confidence.confidenceLabel,
    medicineName: medicineName || "Medicine result",
    medicineNameZh:
      firstNonEmptyString(
        raw.medicineNameZh,
        raw.name_zh,
        medicine.canonicalNameZh,
        medicine.canonical_name_zh,
        medicine.nameZh,
        medicine.name_zh,
        chinesePreview
      ) ||
      (sourceType === "barcode"
        ? "Barcode-based lookup result"
        : "Chinese text available below"),
    matchStatus: humanizeMatchStatus(
      firstNonEmptyString(
        raw.matchStatus,
        raw.match_status,
        medicine.matchStatus
      ) || "unknown"
    ),
    ocrStatus: humanizeStatus(
      firstNonEmptyString(raw.ocrStatus, raw.ocr_status) ||
        (sourceType === "barcode" ? "not_applicable" : "not available")
    ),
    aiStatus: humanizeStatus(
      firstNonEmptyString(raw.aiStatus, raw.ai_status) || "not available"
    ),
    trustNotes:
      firstNonEmptyString(raw.trustNotes, raw.trust_notes) ||
      "Trust metadata was not returned by the backend for this result.",
    barcode: barcode || "Not available",
    dosage:
      firstNonEmptyString(
        raw.dosage,
        medicine.dosage_text,
        medicine.dosageText
      ) || "Dosage not extracted clearly",
    usage:
      firstNonEmptyString(raw.usage, raw.instructions, medicine.usage) ||
      "Usage details were not returned by the backend.",
    manufacturer:
      firstNonEmptyString(raw.manufacturer, medicine.manufacturer) ||
      "Manufacturer not available",
    translatedSummary:
      firstNonEmptyString(
        raw.translatedSummary,
        raw.translatedSummaryEn,
        raw.translated_summary_en,
        raw.translated_text,
        raw.summary,
        raw.explanation
      ) || "English explanation was not returned.",
    extractedText: rawText || "Original Chinese text was not returned.",
    warnings:
      warnings.length > 0
        ? warnings
        : ["No warning text was returned by the backend."],
    createdAtLabel: formatDateLabel(raw.created_at ?? raw.createdAt),
    imagePreview: buildImageUrl(raw),
  };
}

const MetaChip = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
    {label}: {value}
  </div>
);

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.12em] mb-2">
      {title}
    </p>
    <div className="text-slate-900 leading-relaxed">{children}</div>
  </div>
);

export default function ScanResultPage() {
  const location = useLocation();
  const [showOriginalText, setShowOriginalText] = useState(false);

  const locationState = (location.state ?? {}) as {
    result?: unknown;
    medicineName?: string;
    medicine_name?: string;
    medicineNameZh?: string;
    name_zh?: string;
    dosage?: string;
    usage?: string;
    manufacturer?: string;
    warnings?: string[];
    translatedSummary?: string;
    translated_text?: string;
    extractedText?: string;
    raw_text?: string;
    raw_ocr_text?: string;
    confidence?: number;
    ocr_confidence?: number;
    sourceType?: string;
    source_type?: string;
    matchStatus?: string;
    match_status?: string;
    ocrStatus?: string;
    ocr_status?: string;
    aiStatus?: string;
    ai_status?: string;
    trustNotes?: string;
    trust_notes?: string;
    barcode?: string;
    imagePreview?: string | null;
    image_url?: string | null;
    image_path?: string | null;
    scanId?: string;
    scan_id?: string;
    created_at?: string;
  };

  const result = useMemo(() => {
    if (locationState.result) return normalizeResult(locationState.result);
    return normalizeResult(locationState);
  }, [locationState]);

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            No scan result loaded
          </h1>
          <p className="text-slate-600 leading-relaxed max-w-2xl">
            This page expects a scan result payload from the scan flow.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/scan"
              className="rounded-full bg-brand-secondary px-5 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
            >
              Go to scan
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lowConfidence =
    result.confidenceValue !== null && result.confidenceValue < 0.7;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          Result Detail
        </p>

        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          {result.medicineName}
        </h1>

        <p className="text-lg text-brand-primary font-medium">
          {result.medicineNameZh}
        </p>

        <div className="flex flex-wrap gap-2">
          <MetaChip label="source" value={result.sourceLabel} />
          <MetaChip label="match" value={result.matchStatus} />
          <MetaChip label="OCR" value={result.ocrStatus} />
          <MetaChip label="AI" value={result.aiStatus} />
          {result.confidenceLabel ? (
            <MetaChip label="confidence" value={result.confidenceLabel} />
          ) : null}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary-container/40 px-4 py-2 text-sm font-semibold text-brand-on-primary-container">
          <ShieldCheck size={16} />
          Keep verified data, OCR text, and AI explanation visibly separate.
        </div>
      </header>

      {lowConfidence ? (
        <div className="rounded-[24px] bg-amber-50 border border-amber-100 p-4 flex items-start gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-sm leading-relaxed">
            OCR confidence looks low. Retake the image or verify key fields manually
            before relying on this result.
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm overflow-hidden">
            <div className="aspect-square rounded-[24px] overflow-hidden bg-slate-50 flex items-center justify-center">
              {result.imagePreview ? (
                <img
                  src={result.imagePreview}
                  alt="Uploaded medicine preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-6">
                  <Pill className="w-16 h-16 mx-auto text-brand-secondary -rotate-45" />
                  <p className="mt-4 text-sm text-slate-500">
                    {result.sourceType === "barcode"
                      ? "Barcode-based result"
                      : "No image preview available for this result."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">Barcode:</span>{" "}
                {result.barcode}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">Scan ID:</span>{" "}
                {result.scanId}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">Manufacturer:</span>{" "}
                {result.manufacturer}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">Source:</span>{" "}
                {result.sourceLabel}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">OCR status:</span>{" "}
                {result.ocrStatus}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-900">AI status:</span>{" "}
                {result.aiStatus}
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3 sm:col-span-2">
                <span className="font-bold text-slate-900">Scan time:</span>{" "}
                {result.createdAtLabel}
              </div>
            </div>
          </div>

          <InfoCard title="Warnings">
            <div className="space-y-2">
              {result.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-[18px] bg-amber-50 border border-amber-100 px-4 py-3 text-amber-900 text-sm"
                >
                  {warning}
                </div>
              ))}
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Dosage">
            <p>{result.dosage}</p>
          </InfoCard>

          <InfoCard title="Usage">
            <p>{result.usage}</p>
          </InfoCard>

          <InfoCard title="English explanation">
            <p className="whitespace-pre-wrap">{result.translatedSummary}</p>
          </InfoCard>

          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowOriginalText((value) => !value)}
              className="w-full text-left"
            >
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.12em] mb-2">
                Original Chinese text
              </p>
              <div className="text-slate-900 font-semibold">
                {showOriginalText
                  ? "Hide original extracted Chinese text"
                  : "Show original extracted Chinese text"}
              </div>
            </button>

            {showOriginalText ? (
              <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap">
                {result.extractedText}
              </div>
            ) : null}
          </div>

          <InfoCard title="Trust and source notes">
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {result.trustNotes}
            </p>
          </InfoCard>

          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.12em] mb-4">
              Actions
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/reminders/create"
                state={{
                  medicineId: result.barcode !== "Not available" ? result.barcode : "",
                  medicineName: result.medicineName,
                  dosageNote: result.dosage,
                  sourceScanId: result.scanId,
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-5 py-3.5 text-white font-bold shadow-lg shadow-brand-secondary/20 hover:brightness-95 transition-all"
              >
                Create reminder
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                to="/history"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <Clock3 className="w-4 h-4" />
                Open history
              </Link>

              <Link
                to="/scan"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Rescan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}