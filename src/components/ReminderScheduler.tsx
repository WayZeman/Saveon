"use client";

import { useCallback, useEffect, useRef } from "react";
import { shouldTriggerReminder, type ReminderRecord } from "@/lib/reminder-schedule";

const CHECK_INTERVAL_MS = 30_000;
const FIRED_KEY = "saveon_reminder_fired";

function firedStorageKey(id: string, date: string, time: string): string {
  return `${id}:${date}:${time}`;
}

function readFiredKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markFiredLocally(key: string) {
  const keys = readFiredKeys();
  keys.add(key);
  sessionStorage.setItem(FIRED_KEY, JSON.stringify([...keys].slice(-200)));
}

function showNotification(message: string) {
  if (typeof window === "undefined") return;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Saveon", {
      body: message,
      icon: "/icon.svg",
      tag: `saveon-${message.slice(0, 40)}`,
    });
    return;
  }

  if (document.visibilityState === "visible") {
    window.alert(message);
  }
}

export function ReminderScheduler() {
  const remindersRef = useRef<ReminderRecord[]>([]);
  const checkingRef = useRef(false);

  const loadReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      if (!res.ok) return;
      remindersRef.current = (await res.json()) as ReminderRecord[];
    } catch {
      /* ignore */
    }
  }, []);

  const checkReminders = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const fired = readFiredKeys();

      for (const reminder of remindersRef.current) {
        if (!shouldTriggerReminder(reminder, now)) continue;

        const localKey = firedStorageKey(reminder.id, dateKey, reminder.time);
        if (fired.has(localKey)) continue;

        markFiredLocally(localKey);
        showNotification(reminder.message);

        await fetch(`/api/reminders/${reminder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markTriggered: true }),
        }).catch(() => undefined);
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadReminders();
    checkReminders();

    const interval = window.setInterval(checkReminders, CHECK_INTERVAL_MS);
    const onUpdated = () => {
      loadReminders();
    };
    window.addEventListener("reminders-updated", onUpdated);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("reminders-updated", onUpdated);
    };
  }, [loadReminders, checkReminders]);

  return null;
}
