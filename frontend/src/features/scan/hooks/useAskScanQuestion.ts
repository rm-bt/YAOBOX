import { useMutation } from "@tanstack/react-query";
import { askScanQuestion } from "../../../api/scans.api";
import type { AskScanQuestionRequest } from "../../../api/types/scan.types";

export function useAskScanQuestion() {
  return useMutation({
    mutationFn: (payload: AskScanQuestionRequest) => askScanQuestion(payload),
  });
}