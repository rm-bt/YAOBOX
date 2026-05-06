import { useMutation } from "@tanstack/react-query";
import { uploadPrescriptionScan } from "../../../api/scans.api";

export function useUploadPrescription() {
  return useMutation({
    mutationFn: uploadPrescriptionScan,
  });
}