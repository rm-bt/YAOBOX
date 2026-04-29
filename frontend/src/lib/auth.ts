export function getStoredToken(): string | null {
  const token = window.localStorage.getItem("yaobox_access_token");

  if (!token) return null;

  const cleaned = token.trim();
  if (!cleaned || cleaned === "undefined" || cleaned === "null") {
    return null;
  }

  return cleaned;
}

export function clearLegacyAuthKeys(): void {
  [
    "yaobox_access_token",
    "access_token",
    "token",
    "auth_token",
    "yaobox_token",
    "session",
    "auth",
    "auth-storage",
    "yaobox-auth",
  ].forEach((key) => window.localStorage.removeItem(key));
}