import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyScans } from "../../../api/scans.api";
import { mapScanResponse } from "../../scan/utils/mapScanResponse";
import ScanResultBody from "../../scan/components/ScanResultBody";

export default function HistoryDetailPage() {
  const { id } = useParams();

  const scanId = Number(id);

  const {
    data: scans,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-scans"],
    queryFn: getMyScans,
  });

  if (!id || Number.isNaN(scanId)) {
    return <div className="p-6">Invalid history record.</div>;
  }

  if (isLoading) {
    return <div className="p-6">Loading history record...</div>;
  }

  if (isError || !scans) {
    return <div className="p-6">Failed to load history record.</div>;
  }

  const scan = scans.find((item) => item.id === scanId);

  if (!scan) {
    return <div className="p-6">History record not found.</div>;
  }

  const result = mapScanResponse(scan);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          History Detail
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {result.medicineName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Saved scan record from {new Date(result.createdAt).toLocaleString()}.
        </p>
      </div>

      <ScanResultBody result={result} />
    </main>
  );
}