import { apiClient } from "./client";
import type {
  AskScanQuestionRequest,
  AskScanQuestionResponse,
  BarcodeScanRequest,
  CreateManualScanRequest,
  ScanResponse,
} from "./types/scan.types";

export async function uploadMedicineScan(file: File): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<ScanResponse>("/scans/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function uploadPrescriptionScan(file: File): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<ScanResponse>(
    "/scans/upload-prescription",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function uploadReportScan(file: File): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<ScanResponse>(
    "/scans/upload-report",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function createManualScan(
  payload: CreateManualScanRequest
): Promise<ScanResponse> {
  const response = await apiClient.post<ScanResponse>("/scans/", payload);
  return response.data;
}

export async function scanBarcode(
  payload: BarcodeScanRequest
): Promise<ScanResponse> {
  const response = await apiClient.post<ScanResponse>("/scans/barcode", payload);
  return response.data;
}

export async function getMyScans(): Promise<ScanResponse[]> {
  const response = await apiClient.get<ScanResponse[]>("/scans/my");
  return response.data;
}

export async function askScanQuestion(
  payload: AskScanQuestionRequest
): Promise<AskScanQuestionResponse> {
  const response = await apiClient.post<AskScanQuestionResponse>(
    "/scans/ask",
    payload
  );

  return response.data;
}