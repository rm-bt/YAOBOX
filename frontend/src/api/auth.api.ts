import { apiClient } from "./client";
import type {
  LoginFormValues,
  RegisterRequest,
  TokenResponse
} from "./types/auth.types";

export async function loginRequest(
  values: LoginFormValues
): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("username", values.email);
  body.set("password", values.password);

  const response = await apiClient.post<TokenResponse>("/auth/login", body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return response.data;
}

export async function registerRequest(
  values: RegisterRequest
): Promise<void> {
  await apiClient.post("/auth/register", values);
}