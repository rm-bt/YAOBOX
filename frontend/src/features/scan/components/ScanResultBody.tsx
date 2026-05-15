import type { NormalizedScanResult } from "../utils/mapScanResponse";

type ScanResultBodyProps = {
  result: NormalizedScanResult;
};

function InfoSection({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "warning" | "trust";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "trust"
        ? "border-blue-200 bg-blue-50 text-blue-950"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-6">{value}</p>
    </section>
  );
}

export function ScanResultBody({ result }: ScanResultBodyProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Medicine
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          {result.medicineName}
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Source</p>
            <p className="text-sm font-medium text-slate-900">
              {result.sourceType}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Match status</p>
            <p className="text-sm font-medium text-slate-900">
              {result.matchStatus}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">OCR confidence</p>
            <p className="text-sm font-medium text-slate-900">
              {result.confidence !== null
                ? `${Math.round(result.confidence * 100)}%`
                : "Not available"}
            </p>
          </div>
        </div>
      </section>

      <InfoSection
        title="Warnings / Precautions"
        value={result.warning}
        tone="warning"
      />

      <InfoSection title="Ingredients" value={result.ingredients} />

      <InfoSection title="Dosage" value={result.dosage} />

      <InfoSection title="Usage" value={result.usage} />

      <InfoSection title="Manufacturer" value={result.manufacturer} />

      <InfoSection
        title="AI Translation / Explanation"
        value={result.translatedText}
      />

      <InfoSection title="Raw OCR Text" value={result.rawOcrText} />

      <InfoSection title="Trust Notes" value={result.trustNotes} tone="trust" />
    </div>
  );
}

export default ScanResultBody;