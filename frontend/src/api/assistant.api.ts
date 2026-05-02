const API_BASE_URL =
  (import.meta as ImportMeta & {
    env?: { VITE_API_BASE_URL?: string };
  }).env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type AssistantRequest = {
  question: string;
  context?: string;
};

export type AssistantResponse = {
  answer: string;
  safety_note: string;
};

function getStoredToken(): string | null {
  const token = window.localStorage.getItem("yaobox_access_token");

  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token;
}

export async function askAssistant(
  payload: AssistantRequest
): Promise<AssistantResponse> {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Assistant request failed.");
  }

  return response.json();
}