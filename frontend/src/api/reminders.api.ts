import { apiClient } from "./client";

export type ReminderItem = {
  id: number;
  user_id: number;
  scan_id?: number | null;
  medicine_id?: string | number | null;
  medicine_name?: string | null;
  dosage?: string | null;
  dosage_note?: string | null;
  reminder_time: string;
  frequency: string;
  is_active: boolean;
  created_at?: string | null;
};

export type ReminderCreatePayload = {
  scan_id?: string | number | null;
  medicine_id?: string | number | null;
  medicine_name?: string | null;
  dosage?: string | null;
  dosage_note?: string | null;
  reminder_time: string;
  frequency: string;
  is_active?: boolean;
};

export type ReminderUpdatePayload = Partial<ReminderCreatePayload>;

export async function getReminders(): Promise<ReminderItem[]> {
  const response = await apiClient.get<ReminderItem[]>("/reminders/");
  return response.data;
}

export async function createReminder(
  payload: ReminderCreatePayload
): Promise<ReminderItem> {
  const response = await apiClient.post<ReminderItem>("/reminders/", payload);
  return response.data;
}

export async function updateReminder(
  reminderId: string | number,
  payload: ReminderUpdatePayload
): Promise<ReminderItem> {
  const response = await apiClient.put<ReminderItem>(
    `/reminders/${reminderId}`,
    payload
  );
  return response.data;
}

export async function deleteReminder(reminderId: string | number): Promise<void> {
  await apiClient.delete(`/reminders/${reminderId}`);
}