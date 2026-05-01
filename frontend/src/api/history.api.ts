import { apiClient } from "./client";

export type ScanHistoryItem = {
  id: number;
  user_id: number;
  image_path?: string | null;
  barcode?: string | null;
  medicine_id?: number | null;
  medicine_name?: string | null;
  raw_ocr_text?: string | null;
  translated_text?: string | null;
  manufacturer?: string | null;
  usage?: string | null;
  dosage?: string | null;
  warnings?: string | null;
  source_type?: string | null;
  match_status?: string | null;
  ocr_status?: string | null;
  ai_status?: string | null;
  ocr_confidence?: number | null;
  ai_confidence?: string | null;
  trust_notes?: string | null;
  created_at: string;
};

export async function getHistory(): Promise<ScanHistoryItem[]> {
  const response = await apiClient.get<ScanHistoryItem[]>("/history/");
  return response.data;
}

export async function deleteHistoryItem(scanId: string | number): Promise<void> {
  await apiClient.delete(`/history/${scanId}`);
}