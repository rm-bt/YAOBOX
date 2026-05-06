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
  Smartphone,
  Upload,
} from "lucide-react";
import { useUploadMedicineScan } from "../hooks/useUploadMedicineScan";
import { useScanBarcode } from "../hooks/useCreateManualScan";
import {
  mapScanResponse,
  type NormalizedScanResult,
} from "../utils/mapScanResponse";

const dottedBorderStyle: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='32' ry='32' stroke='%2375786f' stroke-width='2' stroke-dasharray='8%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")",
  borderRadius: "2rem",
};

const PROCESS_STEPS = [
  "Uploading image to the backend",
  "Running OCR extraction",
  "Generating explanation and structured output",
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

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadMedicineScanMutation = useUploadMedicineScan();
  const scanBarcodeMutation = useScanBarcode();

  const [mode, setMode] = useState<"image" | "barcode">("image");
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
    setMode("image");
    setErrorMessage("");
    setScanResult(null);
  }

  async function handleAnalyze() {
    setErrorMessage("");
    setScanResult(null);
    setIsAnalyzing(true);

    try {
      if (mode === "image") {
        if (!selectedFile) {
          throw new Error("Choose an image before starting analysis.");
        }

        const response =
          await uploadMedicineScanMutation.mutateAsync(selectedFile);

        setScanResult(mapScanResponse(response, previewUrl, "image_upload"));
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
          Upload a medicine package or enter a barcode. The system extracts the
          medicine name and dosage, checks the verified medicine dataset first,
          then uses AI only when verified data is not enough.
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
                Image Upload
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
                Barcode Entry
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
                  ) : mode === "image" ? (
                    <Upload className="w-10 h-10" />
                  ) : (
                    <ScanLine className="w-10 h-10" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-on-surface">
                    {isAnalyzing
                      ? "Analyzing input..."
                      : mode === "image"
                        ? "Drag and drop your photo"
                        : "Enter medicine barcode"}
                  </h3>

                  <p className="text-on-surface-variant">
                    {isAnalyzing
                      ? PROCESS_STEPS[stepIndex]
                      : mode === "image"
                        ? "Supported formats: JPG, PNG, HEIC. Clear photos of labels work best."
                        : "Use the barcode from the package when image upload is not needed."}
                  </p>
                </div>

                {mode === "image" ? (
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
                        (mode === "image"
                          ? !selectedFile
                          : barcode.trim().length === 0)
                      }
                      className="px-10 py-4 bg-on-surface text-white rounded-full font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze Medicine
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
                desc="Capture the whole package or report so dosage and warnings are not cut off."
              />
            </div>

            <div className="flex flex-col items-center pt-1 gap-2">
              <p className="text-xs text-on-surface-variant font-medium opacity-70">
                Typical analysis takes a few seconds depending on OCR and AI
                response time.
              </p>
              <p className="text-xs text-on-surface-variant opacity-70 text-center max-w-2xl">
                Privacy note: uploads may contain health-related information.
                Only send what you intend to analyze and save.
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
                      Barcode-based result
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-8 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="px-4 py-1.5 bg-yaobox-primary-container text-yaobox-on-primary-container rounded-full text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      IDENTIFIED
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

                <div className="space-y-1">
                  <h3 className="text-4xl font-bold text-on-surface">
                    {result.medicineName}
                  </h3>
                  <p className="text-lg text-yaobox-primary font-medium">
                    {result.medicineNameZh}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-surface-container rounded-2xl">
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">
                      Dosage
                    </p>
                    <p className="font-medium text-on-surface">
                      {result.dosage}
                    </p>
                  </div>

                  <div className="p-5 bg-yaobox-tertiary-container/25 rounded-2xl">
                    <p className="text-xs text-yaobox-tertiary font-bold uppercase tracking-wider mb-2">
                      Warning
                    </p>
                    <p className="text-sm font-medium text-yaobox-tertiary">
                      {result.warnings[0] ??
                        "No warning text was returned by the backend."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    English Explanation
                  </p>
                  <p className="text-on-surface leading-relaxed">
                    {result.translatedSummary}
                  </p>
                </div>

                <details className="p-5 bg-surface-container-low rounded-2xl">
                  <summary className="cursor-pointer text-sm font-bold text-on-surface">
                    Show original extracted Chinese text
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                    {result.extractedText}
                  </p>
                </details>

                <div className="flex flex-wrap gap-4 pt-2">
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
                    {result.barcode}
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