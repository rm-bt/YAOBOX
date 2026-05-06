import { env } from "../../../app/config/env";
import type { ScanResponse } from "../../../api/types/scan.types";

type RawRecord = Record<string, unknown>;

export type NormalizedScanResult = {
  scanId: string;
  medicineId: string;
  sourceType: string;
  sourceLabel: string;
  confidence: number | null;
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
  imagePreview: string | null;
  createdAtLabel: string;
};

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function humanizeSourceType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "barcode") return "Barcode";
  if (normalized === "image_upload") return "Image Upload";
  if (normalized === "prescription_upload") return "Prescription Upload";
  if (normalized === "manual_entry") return "Manual Entry";
  if (normalized === "prescription") return "Prescription";
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
  if (normalized === "not_used_catalog_match") return "Catalog data used";

  return value.replace(/_/g, " ");
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

  return lines.find(containsChinese) ?? "";
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

function buildImageUrl(
  raw: RawRecord,
  localPreviewUrl?: string | null
): string | null {
  if (localPreviewUrl) return localPreviewUrl;

  const direct = firstNonEmptyString(
    raw.image_url,
    raw.imageUrl,
    raw.imagePreview
  );

  if (direct) {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return direct;
    }

    if (direct.startsWith("/")) {
      return `${env.apiBaseUrl}${direct}`;
    }

    return `${env.apiBaseUrl}/${direct}`;
  }

  const imagePath = firstNonEmptyString(raw.image_path, raw.imagePath);
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

function normalizeConfidence(
  raw: RawRecord,
  sourceType: string
): { confidence: number | null; confidenceLabel: string | null } {
  const confidence = raw.confidence;

  if (typeof confidence === "number") {
    return {
      confidence,
      confidenceLabel: `${Math.round(confidence * 100)}% confidence`,
    };
  }

  if (confidence && typeof confidence === "object") {
    const confidenceObject = confidence as RawRecord;

    if (typeof confidenceObject.ocr === "number") {
      return {
        confidence: confidenceObject.ocr,
        confidenceLabel: `${Math.round(confidenceObject.ocr * 100)}% OCR`,
      };
    }
  }

  if (typeof raw.ocr_confidence === "number") {
    return {
      confidence: raw.ocr_confidence,
      confidenceLabel: `${Math.round(raw.ocr_confidence * 100)}% OCR`,
    };
  }

  if (sourceType === "barcode") {
    return {
      confidence: null,
      confidenceLabel: "Barcode lookup",
    };
  }

  return {
    confidence: null,
    confidenceLabel: null,
  };
}

function splitWarnings(...values: unknown[]): string[] {
  const warnings: string[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          warnings.push(item.trim());
        }
      });

      continue;
    }

    const text = firstNonEmptyString(value);

    if (text) {
      text
        .split(/\n|;|；|。/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => warnings.push(item));
    }
  }

  return Array.from(new Set(warnings));
}

function barcodeFallback(raw: RawRecord, medicine: RawRecord): string {
  const barcode = firstNonEmptyString(raw.barcode, raw.bar_code, medicine.barcode);
  return barcode ? `Barcode ${barcode}` : "";
}

export function mapScanResponse(
  input: ScanResponse | unknown,
  localPreviewUrl?: string | null,
  fallbackSourceType: "image_upload" | "barcode" | "prescription_upload" =
    "image_upload"
): NormalizedScanResult {
  const raw = ((input ?? {}) as RawRecord) || {};
  const medicine = ((raw.medicine as RawRecord | undefined) ?? {}) as RawRecord;

  const sourceType =
    firstNonEmptyString(raw.sourceType, raw.source_type) || fallbackSourceType;

  const confidence = normalizeConfidence(raw, sourceType);

  const extractedText =
    firstNonEmptyString(
      raw.extractedText,
      raw.extractedTextZh,
      raw.extracted_text_zh,
      raw.raw_text,
      raw.raw_ocr_text,
      raw.ocr_text,
      raw.original_text
    ) || "Original extracted text was not returned.";

  const chinesePreview = extractChinesePreview(extractedText);

  const warnings = splitWarnings(
    raw.warnings,
    raw.warning,
    raw.precautions,
    medicine.warnings,
    medicine.warning
  );

  return {
    scanId: String(raw.scanId ?? raw.scan_id ?? raw.id ?? "unknown"),
    medicineId: String(raw.medicine_id ?? raw.medicineId ?? medicine.id ?? ""),
    sourceType,
    sourceLabel: humanizeSourceType(sourceType),
    confidence: confidence.confidence,
    confidenceLabel: confidence.confidenceLabel,
    medicineName:
      firstNonEmptyString(
        raw.medicineName,
        raw.medicine_name,
        medicine.nameEn,
        medicine.name_en,
        raw.name,
        raw.title,
        barcodeFallback(raw, medicine),
        chinesePreview
      ) || "Medicine result",
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
        medicine.matchStatus,
        raw.status
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
    barcode:
      firstNonEmptyString(raw.barcode, raw.bar_code, medicine.barcode) ||
      "Not available",
    dosage:
      firstNonEmptyString(
        raw.dosage,
        raw.dosage_instructions,
        medicine.dosage_text,
        medicine.dosageText,
        medicine.dosage
      ) || "Dosage not extracted clearly",
    usage:
      firstNonEmptyString(
        raw.usage,
        raw.instructions,
        raw.usage_guidelines,
        medicine.usage,
        medicine.instructions
      ) || "Usage details were not returned by the backend.",
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
      ) || "English explanation was not returned by the backend.",
    extractedText,
    warnings:
      warnings.length > 0
        ? warnings
        : ["No warning text was returned by the backend."],
    imagePreview: buildImageUrl(raw, localPreviewUrl),
    createdAtLabel: formatDateLabel(raw.created_at ?? raw.createdAt),
  };
}