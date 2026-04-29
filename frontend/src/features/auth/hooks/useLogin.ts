import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../../../api/auth.api";
import type { LoginFormValues } from "../../../api/types/auth.types";
import { useAuthStore } from "../store/auth.store";

type LoginLikeResponse = {
  access_token?: unknown;
  token?: unknown;
  data?: {
    access_token?: unknown;
    token?: unknown;
    data?: {
      access_token?: unknown;
      token?: unknown;
    };
  };
};

function extractAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as LoginLikeResponse;

  const candidates = [
    response.access_token,
    response.token,
    response.data?.access_token,
    response.data?.token,
    response.data?.data?.access_token,
    response.data?.data?.token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function useLogin() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const response = await loginRequest(values);
      const accessToken = extractAccessToken(response);

      if (!accessToken) {
        throw new Error(
          "Login response did not include a usable access token. Check auth.api/loginRequest response shape."
        );
      }

      return { accessToken };
    },
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      navigate("/dashboard", { replace: true });
    },
    onError: () => {
      clearSession();
    },
  });
}