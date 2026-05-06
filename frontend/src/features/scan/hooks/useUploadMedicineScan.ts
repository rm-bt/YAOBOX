import { useMutation } from "@tanstack/react-query";
import { uploadMedicineScan } from "../../../api/scans.api";

export function useUploadMedicineScan() {
  return useMutation({
    mutationFn: uploadMedicineScan,
  });
}