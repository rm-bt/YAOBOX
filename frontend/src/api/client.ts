import axios from "axios";
import { env } from "../app/config/env";
import { useAuthStore } from "../features/auth/store/auth.store";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});