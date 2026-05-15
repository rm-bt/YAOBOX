import { useMutation } from "@tanstack/react-query";

import {
  uploadMedicineScan,
  uploadPrescriptionScan,
  uploadReportScan,
} from "../../../api/scans.api";

export function useUploadMedicineScan() {
  return useMutation({
    mutationFn: uploadMedicineScan,
  });
}

export function useUploadPrescriptionScan() {
  return useMutation({
    mutationFn: uploadPrescriptionScan,
  });
}

export function useUploadReportScan() {
  return useMutation({
    mutationFn: uploadReportScan,
  });
}