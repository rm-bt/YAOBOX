import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/auth.store";

function isExpiredJwt(token: string): boolean {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return true;
  }

  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };

    if (!payload.exp) {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const clearSession = useAuthStore((state) => state.clearSession);
  const location = useLocation();

  const tokenIsValid = useMemo(() => {
    if (!token) return false;
    return !isExpiredJwt(token);
  }, [token]);

  useEffect(() => {
    if (token && !tokenIsValid) {
      clearSession();
    }
  }, [token, tokenIsValid, clearSession]);

  if (!tokenIsValid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}