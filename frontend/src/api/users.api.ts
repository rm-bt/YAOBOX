import { apiClient } from "./client";

export type UserMeResponse = {
  id: number;
  email: string;
  full_name?: string | null;
  language_pref?: string | null;
  created_at?: string | null;
};

export async function getCurrentUser(): Promise<UserMeResponse> {
  const response = await apiClient.get<UserMeResponse>("/users/me");
  return response.data;
}