const NOTIFIED_REMINDERS_KEY = "yaobox_notified_reminders";

export type BrowserNotificationPermission =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

function readNotifiedReminderKeys(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(NOTIFIED_REMINDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeNotifiedReminderKeys(keys: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  const compactKeys = Array.from(keys).slice(-200);
  window.localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(compactKeys));
}

export function wasReminderNotificationShown(reminderKey: string): boolean {
  return readNotifiedReminderKeys().has(reminderKey);
}

export function markReminderNotificationShown(reminderKey: string) {
  const keys = readNotifiedReminderKeys();
  keys.add(reminderKey);
  writeNotifiedReminderKeys(keys);
}

export function showBrowserNotification(title: string, body: string) {
  if (getBrowserNotificationPermission() !== "granted") {
    return false;
  }

  new Notification(title, {
    body,
    icon: "/favicon.svg",
    tag: `yaobox-${title}`,
  });

  return true;
}