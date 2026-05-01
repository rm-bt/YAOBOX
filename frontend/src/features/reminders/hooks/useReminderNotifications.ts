import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getBrowserNotificationPermission,
  markReminderNotificationShown,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  wasReminderNotificationShown,
  type BrowserNotificationPermission,
} from "../../../lib/notifications";

export type ReminderNotificationInput = {
  id: string;
  title: string;
  dosageNote: string;
  reminderTimeRaw: string;
  isActive: boolean;
};

function getReminderTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getReminderKey(reminder: ReminderNotificationInput): string {
  return `${reminder.id}:${reminder.reminderTimeRaw}`;
}

function isReminderDueNow(reminder: ReminderNotificationInput): boolean {
  if (!reminder.isActive) {
    return false;
  }

  const reminderTime = getReminderTime(reminder.reminderTimeRaw);

  if (!reminderTime) {
    return false;
  }

  const now = Date.now();
  const reminderMs = reminderTime.getTime();

  const twoMinutes = 2 * 60 * 1000;

  return reminderMs <= now && now - reminderMs <= twoMinutes;
}

export function useReminderNotifications(reminders: ReminderNotificationInput[]) {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [lastNotificationLabel, setLastNotificationLabel] = useState<string | null>(null);

  const supported = permission !== "unsupported";
  const enabled = permission === "granted";

  const activeReminderCount = useMemo(
    () => reminders.filter((reminder) => reminder.isActive).length,
    [reminders]
  );

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  useEffect(() => {
    if (!enabled || reminders.length === 0) {
      return;
    }

    function checkDueReminders() {
      for (const reminder of reminders) {
        if (!isReminderDueNow(reminder)) {
          continue;
        }

        const reminderKey = getReminderKey(reminder);

        if (wasReminderNotificationShown(reminderKey)) {
          continue;
        }

        const title = `Time for ${reminder.title || "your medicine"}`;
        const body =
          reminder.dosageNote && reminder.dosageNote !== "No dosage note"
            ? reminder.dosageNote
            : "Open YAOBOX to review your reminder.";

        const shown = showBrowserNotification(title, body);

        if (shown) {
          markReminderNotificationShown(reminderKey);
          setLastNotificationLabel(reminder.title || "Medication reminder");
        }
      }
    }

    checkDueReminders();

    const timer = window.setInterval(checkDueReminders, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, reminders]);

  return {
    supported,
    enabled,
    permission,
    activeReminderCount,
    lastNotificationLabel,
    requestPermission,
  };
}