import type { ScanResponse } from "../../../api/types/scan.types";

export type NormalizedScanResult = {
  id: number;
  scanId: number;

  medicineId: number | null;

  medicineName: string;
  medicineNameZh: string;

  imagePath: string | null;
  imagePreview: string | null;

  barcode: string | null;

  sourceType: string;
  sourceLabel: string;

  matchStatus: string;

  ocrStatus: string;
  aiStatus: string;

  confidence: number | null;
  confidenceLabel: string | null;

  manufacturer: string;
  ingredients: string;

  usage: string;
  dosage: string;

  warning: string;
  warnings: string[];

  translatedText: string;
  translatedSummary: string;

  rawOcrText: string;
  extractedText: string;

  trustNotes: string;

  createdAt: string;
};

function text(value: string | null | undefined, fallback: string): string {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function confidenceLabel(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

function sourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "image_upload":
      return "Image Upload";

    case "barcode":
      return "Barcode Prototype";

    case "prescription_upload":
      return "Prescription Upload";
      case "report_upload":
  return "Medical Report Upload";
      

    default:
      return sourceType;
  }
}

export function mapScanResponse(
  raw: ScanResponse,
  previewUrl?: string | null,
  fallbackSource?: string
): NormalizedScanResult {
  const source = raw.source_type ?? fallbackSource ?? "unknown";

  const warningText = text(
    raw.warnings,
    "No warning text was returned by the backend."
  );

  return {
    id: raw.id,
    scanId: raw.id,

    medicineId: raw.medicine_id ?? null,

    medicineName: text(raw.medicine_name, "Unknown medicine"),
    medicineNameZh: text(raw.medicine_name, "Unknown medicine"),

    imagePath: raw.image_path ?? null,
    imagePreview: previewUrl ?? raw.image_path ?? null,

    barcode: raw.barcode ?? null,

    sourceType: source,
    sourceLabel: sourceLabel(source),

    matchStatus: text(raw.match_status, "unknown"),

    ocrStatus: text(raw.ocr_status, "unknown"),
    aiStatus: text(raw.ai_status, "unknown"),

    confidence: raw.ocr_confidence ?? null,
    confidenceLabel: confidenceLabel(raw.ocr_confidence ?? null),

    manufacturer: text(raw.manufacturer, "Manufacturer not available."),

    ingredients: text(raw.ingredients, "Ingredients not available."),

    usage: text(raw.usage, "Usage information not available."),

    dosage: text(raw.dosage, "Dosage information not available."),

    warning: warningText,
    warnings: [warningText],

    translatedText: text(
      raw.translated_text,
      "No AI explanation available."
    ),

    translatedSummary: text(
      raw.translated_text,
      "No AI explanation available."
    ),

    rawOcrText: text(
      raw.raw_ocr_text,
      "No OCR text available."
    ),

    extractedText: text(
      raw.raw_ocr_text,
      "No OCR text available."
    ),

    trustNotes: text(
      raw.trust_notes,
      "No trust notes available."
    ),

    createdAt: raw.created_at,
  };
}