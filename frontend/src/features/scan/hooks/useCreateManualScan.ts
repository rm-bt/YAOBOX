import { useMutation } from "@tanstack/react-query";
import { createManualScan, scanBarcode } from "../../../api/scans.api";
import type {
  BarcodeScanRequest,
  CreateManualScanRequest,
} from "../../../api/types/scan.types";

export function useCreateManualScan() {
  return useMutation({
    mutationFn: (payload: CreateManualScanRequest) => createManualScan(payload),
  });
}

export function useScanBarcode() {
  return useMutation({
    mutationFn: (payload: BarcodeScanRequest) => scanBarcode(payload),
  });
}