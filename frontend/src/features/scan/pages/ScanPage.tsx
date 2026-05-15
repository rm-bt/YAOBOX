import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Lightbulb,
  Loader2,
  Maximize2,
  Pill,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";

import {
  useUploadMedicineScan,
  useUploadPrescriptionScan,
  useUploadReportScan,
} from "../hooks/useUploadMedicineScan";
import { useScanBarcode } from "../hooks/useCreateManualScan";
import {
  mapScanResponse,
  type NormalizedScanResult,
} from "../utils/mapScanResponse";

type ScanMode = "image" | "barcode" | "prescription" | "report";

const dottedBorderStyle: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='32' ry='32' stroke='%2375786f' stroke-width='2' stroke-dasharray='8%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")",
  borderRadius: "2rem",
};

const PROCESS_STEPS = [
  "Uploading file to the backend",
  "Running OCR extraction",
  "Preparing translation and review output",
  "Saving scan record",
] as const;

const TipCard = ({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="bg-surface-container-low p-6 rounded-[24px] flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className="mt-1 p-2 bg-yaobox-primary-container text-yaobox-primary rounded-xl">
      {icon}
    </div>
    <div className="space-y-1">
      <h4 className="font-semibold text-sm text-on-surface">{title}</h4>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  </div>
);

function isVerifiedCatalogResult(result: NormalizedScanResult): boolean {
  return result.matchStatus.toLowerCase().includes("verified");
}

function isDocumentResult(result: NormalizedScanResult): boolean {
  return (
    result.sourceType === "prescription_upload" ||
    result.sourceType === "report_upload"
  );
}

function shouldShowChineseSubtitle(result: NormalizedScanResult): boolean {
  if (!result.medicineNameZh) return false;

  const normalized = result.medicineNameZh.trim().toLowerCase();

  if (
    normalized.includes("barcode-based lookup") ||
    normalized.includes("chinese text available")
  ) {
    return false;
  }

  if (isVerifiedCatalogResult(result)) {
    return false;
  }

  return normalized !== result.medicineName.trim().toLowerCase();
}

function buildResultSubtitle(result: NormalizedScanResult): string {
  if (isVerifiedCatalogResult(result)) {
    return "Verified catalogue match. Medicine details are shown separately from OCR evidence.";
  }

  if (result.sourceType === "barcode") {
    return "Barcode lookup prototype result. This depends on barcode records existing in the local catalogue.";
  }

  if (result.sourceType === "prescription_upload") {
    return "Prescription OCR result. The system translates visible text only and does not diagnose.";
  }

  if (result.sourceType === "report_upload") {
    return "Medical report OCR result. The system translates visible text only and does not diagnose.";
  }

  return "OCR extracted result. Review the original text and confidence details carefully.";
}

function formatExplanation(value: string): string {
  return value
    .replace(/\s+(English Translation:)/g, "\n$1")
    .replace(/\s+(Medicine:)/g, "\n$1")
    .replace(/\s+(Manufacturer:)/g, "\n$1")
    .replace(/\s+(Ingredients:)/g, "\n$1")
    .replace(/\s+(Usage:)/g, "\n$1")
    .replace(/\s+(Dosage:)/g, "\n$1")
    .replace(/\s+(Warnings:)/g, "\n$1")
    .replace(/\s+(Simple Explanation:)/g, "\n$1")
    .replace(/\s+(Trust:)/g, "\n$1")
    .replace(/\s+(Safety Note:)/g, "\n$1")
    .trim();
}

function getModeTitle(mode: ScanMode): string {
  if (mode === "image") return "Upload a medicine package";
  if (mode === "prescription") return "Upload a prescription image";
  if (mode === "report") return "Upload a medical report";
  return "Enter barcode number";
}

function getModeDescription(mode: ScanMode): string {
  if (mode === "image") {
    return "Upload a clear medicine package for OCR and catalogue matching.";
  }

  if (mode === "prescription") {
    return "Extract and translate visible text from prescription images.";
  }

  if (mode === "report") {
    return "Extract and translate visible text from medical reports without automatic diagnosis.";
  }

  return "Prototype lookup only. It works when the barcode exists in the local catalogue.";
}

function buildReadableTrustNote(result: NormalizedScanResult): string {
  if (isVerifiedCatalogResult(result)) {
    return "Verified catalogue data was found. Use the catalogue fields first, then review OCR text as supporting evidence.";
  }

  if (result.sourceType === "prescription_upload") {
    return "This is a prescription OCR and translation result. The translation may contain OCR mistakes, so verify important details with a doctor or pharmacist.";
  }

  if (result.sourceType === "report_upload") {
    return "This is a medical report OCR and translation result. It is not a diagnosis and should be reviewed by a medical professional.";
  }

  if (result.sourceType === "barcode") {
    return "This is a barcode lookup prototype. It only works when the barcode exists in the local medicine catalogue.";
  }

  return "No verified catalogue match was found. Review OCR text and translation carefully before relying on the result.";
}

function getResultTitle(result: NormalizedScanResult): string {
  if (result.sourceType === "prescription_upload") return "Prescription OCR";
  if (result.sourceType === "report_upload") return "Medical Report OCR";
  return result.medicineName;
}

function getExplanationTitle(result: NormalizedScanResult): string {
  return isDocumentResult(result) ? "Machine Translation" : "English Explanation";
}

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadMedicineScanMutation = useUploadMedicineScan();
  const uploadPrescriptionScanMutation = useUploadPrescriptionScan();
  const uploadReportScanMutation = useUploadReportScan();
  const scanBarcodeMutation = useScanBarcode();

  const [mode, setMode] = useState<ScanMode>("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [barcode, setBarcode] = useState("");
  const [scanResult, setScanResult] = useState<NormalizedScanResult | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isAnalyzing) {
      setStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setStepIndex((current) =>
        current < PROCESS_STEPS.length - 1 ? current + 1 : current
      );
    }, 1300);

    return () => window.clearInterval(interval);
  }, [isAnalyzing]);

  function resetForNewScan() {
    setScanResult(null);
    setErrorMessage("");
    setSelectedFile(null);
    setBarcode("");
    setIsAnalyzing(false);
    setStepIndex(0);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage("");
    setScanResult(null);
  }

  async function handleAnalyze() {
    setErrorMessage("");
    setScanResult(null);
    setIsAnalyzing(true);

    try {
      if (mode !== "barcode") {
        if (!selectedFile) {
          throw new Error("Choose an image before starting analysis.");
        }

        const response =
          mode === "image"
            ? await uploadMedicineScanMutation.mutateAsync(selectedFile)
            : mode === "prescription"
              ? await uploadPrescriptionScanMutation.mutateAsync(selectedFile)
              : await uploadReportScanMutation.mutateAsync(selectedFile);

        const fallbackSource =
          mode === "image"
            ? "image_upload"
            : mode === "prescription"
              ? "prescription_upload"
              : "report_upload";

        setScanResult(mapScanResponse(response, previewUrl, fallbackSource));
        return;
      }

      const cleanBarcode = barcode.trim();

      if (!cleanBarcode) {
        throw new Error("Enter a barcode before starting analysis.");
      }

      const response = await scanBarcodeMutation.mutateAsync({
        barcode: cleanBarcode,
      });

      setScanResult(mapScanResponse(response, null, "barcode"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Scan failed. Please try again.";

      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const result = scanResult;

  const lowConfidence =
    result?.confidence !== null &&
    result?.confidence !== undefined &&
    result.confidence < 0.7;

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-10 text-center lg:text-left">
        <motion.h1
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-semibold tracking-tight text-on-surface lg:text-5xl"
        >
          Scan Medicine
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-on-surface-variant text-lg mt-3 max-w-3xl"
        >
          Upload a medicine package, prescription, medical report, or enter a
          barcode number. YAOBOX separates verified catalogue data, OCR evidence,
          and translation output.
        </motion.p>
      </header>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="scan-entry"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            className="space-y-8"
          >
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setMode("image")}
                disabled={isAnalyzing}
                className={`px-5 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  mode === "image"
                    ? "bg-yaobox-primary-container text-yaobox-on-primary-container"
                    : "bg-white border border-outline-variant text-on-surface-variant"
                }`}
              >
                Medicine Package
              </button>

              <button
                type="button"
                onClick={() => setMode("barcode")}
                disabled={isAnalyzing}
                className={`px-5 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  mode === "barcode"
                    ? "bg-yaobox-primary-container text-yaobox-on-primary-container"
                    : "bg-white border border-outline-variant text-on-surface-variant"
                }`}
              >
                Barcode Lookup Prototype
              </button>

              <button
                type="button"
                onClick={() => setMode("prescription")}
                disabled={isAnalyzing}
                className={`px-5 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  mode === "prescription"
                    ? "bg-yaobox-primary-container text-yaobox-on-primary-container"
                    : "bg-white border border-outline-variant text-on-surface-variant"
                }`}
              >
                Prescription OCR
              </button>

              <button
                type="button"
                onClick={() => setMode("report")}
                disabled={isAnalyzing}
                className={`px-5 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  mode === "report"
                    ? "bg-yaobox-primary-container text-yaobox-on-primary-container"
                    : "bg-white border border-outline-variant text-on-surface-variant"
                }`}
              >
                Medical Report OCR
              </button>
            </div>

            <div
              style={dottedBorderStyle}
              className="bg-surface-container-lowest p-10 min-h-[420px] flex flex-col items-center justify-center text-center shadow-sm border-2 border-transparent"
            >
              <div className="space-y-6 max-w-md w-full">
                <div className="mx-auto w-20 h-20 rounded-full bg-yaobox-primary-container flex items-center justify-center text-yaobox-primary mb-2">
                  {isAnalyzing ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : mode === "barcode" ? (
                    <ScanLine className="w-10 h-10" />
                  ) : (
                    <Upload className="w-10 h-10" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-on-surface">
                    {isAnalyzing ? "Analyzing input..." : getModeTitle(mode)}
                  </h3>

                  <p className="text-on-surface-variant">
                    {isAnalyzing
                      ? PROCESS_STEPS[stepIndex]
                      : getModeDescription(mode)}
                  </p>
                </div>

                {mode !== "barcode" ? (
                  <>
                    {previewUrl ? (
                      <div className="flex flex-col items-center gap-3 pt-2">
                        <img
                          src={previewUrl}
                          alt="Selected upload preview"
                          className="w-32 h-32 rounded-[24px] object-cover border border-outline-variant shadow-sm"
                        />
                        <p className="text-sm text-on-surface font-medium truncate max-w-full">
                          {selectedFile?.name}
                        </p>
                      </div>
                    ) : null}

                    {!isAnalyzing ? (
                      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={onFileChange}
                        />

                        <input
                          ref={cameraInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          capture="environment"
                          onChange={onFileChange}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-yaobox-secondary text-white rounded-full font-medium hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-yaobox-secondary/20"
                        >
                          <FolderOpen className="w-5 h-5" />
                          Browse Files
                        </button>

                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-yaobox-secondary text-yaobox-secondary rounded-full font-medium hover:bg-yaobox-primary-container/30 transition-all active:scale-95"
                        >
                          <Camera className="w-5 h-5" />
                          Use Camera
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="pt-4">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      placeholder="Enter barcode number"
                      className="w-full bg-white border border-outline-variant/40 rounded-full px-6 py-4 text-center text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-yaobox-primary/10 focus:border-yaobox-primary"
                      disabled={isAnalyzing}
                    />
                  </div>
                )}

                {!isAnalyzing ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={
                        isAnalyzing ||
                        (mode === "barcode"
                          ? barcode.trim().length === 0
                          : !selectedFile)
                      }
                      className="px-10 py-4 bg-on-surface text-white rounded-full font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-[24px] bg-red-50 border border-red-100 p-5 flex items-start gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-sm leading-relaxed">{errorMessage}</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TipCard
                icon={<Lightbulb className="w-5 h-5" />}
                title="Good Lighting"
                desc="Ensure labels are clearly readable under bright, even light."
              />
              <TipCard
                icon={<Smartphone className="w-5 h-5" />}
                title="Keep it Steady"
                desc="Hold your device firm to avoid blur and improve OCR quality."
              />
              <TipCard
                icon={<Maximize2 className="w-5 h-5" />}
                title="Clear Context"
                desc="Capture the whole document so dosage, warnings, or report text are not cut off."
              />
            </div>

            <div className="flex flex-col items-center pt-1 gap-2">
              <p className="text-xs text-on-surface-variant font-medium opacity-70">
                Typical analysis takes a few seconds depending on OCR quality and
                translation.
              </p>
              <p className="text-xs text-on-surface-variant opacity-70 text-center max-w-2xl">
                Safety note: this system helps users understand medicine text. It
                does not diagnose, prescribe, or replace a doctor/pharmacist.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result-view"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-2xl border border-outline-variant/20"
          >
            {lowConfidence ? (
              <div className="mb-6 rounded-[22px] bg-amber-50 border border-amber-100 p-4 flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-sm leading-relaxed">
                  OCR confidence looks low. Review the extracted text carefully
                  and consider retaking the image with better lighting or
                  framing.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col lg:flex-row gap-10 items-start">
              <div className="w-full lg:w-1/3 aspect-square rounded-[2rem] bg-surface-container-low flex items-center justify-center overflow-hidden">
                {result.imagePreview ? (
                  <img
                    src={result.imagePreview}
                    alt="Uploaded scan preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <Pill className="w-14 h-14 text-yaobox-secondary -rotate-45" />
                    <p className="mt-4 text-sm text-on-surface">
                      Barcode lookup prototype result
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-8 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div
                      className={[
                        "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2",
                        isVerifiedCatalogResult(result)
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-yaobox-primary-container text-yaobox-on-primary-container",
                      ].join(" ")}
                    >
                      {isVerifiedCatalogResult(result) ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isVerifiedCatalogResult(result)
                        ? "VERIFIED CATALOGUE MATCH"
                        : "OCR / INPUT RESULT"}
                    </div>

                    <div className="px-4 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-xs font-bold uppercase tracking-wide">
                      {result.sourceLabel}
                    </div>

                    <div className="px-4 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-xs font-bold uppercase tracking-wide">
                      {result.matchStatus}
                    </div>
                  </div>

                  {result.confidenceLabel ? (
                    <div className="text-xs text-on-surface-variant font-medium">
                      Confidence: {result.confidenceLabel}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h3 className="text-4xl font-bold text-on-surface">
                    {getResultTitle(result)}
                  </h3>

                  {shouldShowChineseSubtitle(result) ? (
                    <p className="text-lg text-yaobox-primary font-medium">
                      {result.medicineNameZh}
                    </p>
                  ) : null}

                  <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl">
                    {buildResultSubtitle(result)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 leading-relaxed">
                  <div className="font-bold mb-1">Review note</div>
                  {buildReadableTrustNote(result)}
                </div>

                {isDocumentResult(result) ? (
                  <div className="p-5 bg-surface-container-low rounded-2xl">
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                      {getExplanationTitle(result)}
                    </p>
                    <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                      {formatExplanation(result.translatedSummary)}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-surface-container rounded-2xl">
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                          Dosage
                        </p>
                        <p className="font-medium text-on-surface leading-relaxed">
                          {result.dosage}
                        </p>
                      </div>

                      <div className="p-5 bg-yaobox-tertiary-container/25 rounded-2xl">
                        <p className="text-xs text-yaobox-tertiary font-bold uppercase tracking-wider mb-2">
                          Warning
                        </p>
                        <p className="text-sm font-medium text-yaobox-tertiary leading-relaxed">
                          {result.warnings[0] ??
                            "No warning text was returned by the backend."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-surface-container-low rounded-2xl">
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                          Ingredients
                        </p>
                        <p className="text-on-surface leading-relaxed">
                          {result.ingredients}
                        </p>
                      </div>

                      <div className="p-5 bg-surface-container-low rounded-2xl">
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                          Usage
                        </p>
                        <p className="text-on-surface leading-relaxed">
                          {result.usage}
                        </p>
                      </div>

                      <div className="p-5 bg-surface-container-low rounded-2xl">
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                          Manufacturer
                        </p>
                        <p className="text-on-surface leading-relaxed">
                          {result.manufacturer}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 bg-surface-container-low rounded-2xl">
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                        {getExplanationTitle(result)}
                      </p>
                      <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                        {formatExplanation(result.translatedSummary)}
                      </p>
                    </div>
                  </>
                )}

                <details className="p-5 bg-surface-container-low rounded-2xl">
                  <summary className="cursor-pointer text-sm font-bold text-on-surface">
                    Show full OCR text
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                    {result.extractedText}
                  </p>
                </details>

                <details className="p-5 bg-surface-container-low rounded-2xl">
                  <summary className="cursor-pointer text-sm font-bold text-on-surface">
                    Show technical trust details
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                    {result.trustNotes}
                  </p>
                </details>

                <div className="flex flex-wrap gap-4 pt-2">
                  {!isDocumentResult(result) ? (
                    <Link
                      to="/reminders/create"
                      state={{
                        medicineId: result.medicineId,
                        medicineName: result.medicineName,
                        dosageNote: result.dosage,
                        sourceScanId: result.scanId,
                      }}
                      className="px-8 py-4 bg-on-surface text-white rounded-full font-bold hover:opacity-90 active:scale-95 transition-all"
                    >
                      Create Reminder
                    </Link>
                  ) : null}

                  <Link
                    to="/history"
                    className="px-8 py-4 bg-surface-container text-on-surface rounded-full font-bold hover:bg-surface-container-high active:scale-95 transition-all"
                  >
                    View History
                  </Link>

                  <button
                    type="button"
                    onClick={resetForNewScan}
                    className="px-8 py-4 bg-surface-container text-on-surface rounded-full font-bold hover:bg-surface-container-high active:scale-95 transition-all flex items-center gap-2"
                  >
                    Scan New Item
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-on-surface-variant">
                  <div className="p-4 rounded-2xl border border-outline-variant/30">
                    <span className="font-bold text-on-surface">Barcode:</span>{" "}
                    {result.barcode ?? "Not available"}
                  </div>

                  <div className="p-4 rounded-2xl border border-outline-variant/30">
                    <span className="font-bold text-on-surface">Scan ID:</span>{" "}
                    {result.scanId}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:block fixed bottom-0 right-0 p-12 pointer-events-none opacity-30 blur-3xl">
        <div className="w-96 h-96 rounded-full bg-yaobox-primary-container" />
      </div>
    </div>
  );
}