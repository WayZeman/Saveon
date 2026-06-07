export type ReminderInterval = "once" | "daily" | "weekly" | "monthly";

export type ReminderRecord = {
  id: string;
  message: string;
  time: string;
  startDate: string;
  interval: ReminderInterval;
  timezone: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
};

type ZonedParts = {
  dateKey: string;
  weekday: number;
  hours: number;
  minutes: number;
  day: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function getClientTimezone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "Europe/Kyiv";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Kyiv";
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = Number(get("day"));
  const hours = Number(get("hour"));
  const minutes = Number(get("minute"));
  const weekday = WEEKDAY_MAP[get("weekday")] ?? 0;

  return {
    dateKey: `${year}-${month}-${String(day).padStart(2, "0")}`,
    weekday,
    hours,
    minutes,
    day,
  };
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weekdayFromStartDate(startDate: string, timeZone: string): number {
  const probe = new Date(`${startDate}T12:00:00.000Z`);
  return getZonedParts(probe, timeZone).weekday;
}

export function shouldTriggerReminder(reminder: ReminderRecord, now = new Date()): boolean {
  if (!reminder.enabled) return false;

  const parsedTime = parseTime(reminder.time);
  if (!parsedTime) return false;

  const timeZone = reminder.timezone || "Europe/Kyiv";
  const zoned = getZonedParts(now, timeZone);

  if (zoned.hours !== parsedTime.hours || zoned.minutes !== parsedTime.minutes) return false;
  if (zoned.dateKey < reminder.startDate) return false;

  if (reminder.lastTriggeredAt) {
    const lastZoned = getZonedParts(new Date(reminder.lastTriggeredAt), timeZone);
    if (reminder.interval === "once") return false;
    if (lastZoned.dateKey === zoned.dateKey) return false;
  }

  switch (reminder.interval) {
    case "once":
      return zoned.dateKey === reminder.startDate;
    case "daily":
      return true;
    case "weekly":
      return zoned.weekday === weekdayFromStartDate(reminder.startDate, timeZone);
    case "monthly":
      return zoned.day === Number(reminder.startDate.split("-")[2]);
    default:
      return false;
  }
}

export function formatReminderSchedule(
  reminder: Pick<ReminderRecord, "time" | "interval" | "startDate">,
  labels: Record<ReminderInterval, string>,
): string {
  const [y, m, d] = reminder.startDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dateStr = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: reminder.interval === "once" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);

  if (reminder.interval === "once") {
    return `${dateStr} · ${reminder.time}`;
  }
  if (reminder.interval === "weekly") {
    const weekday = new Intl.DateTimeFormat("uk-UA", { weekday: "long", timeZone: "UTC" }).format(date);
    return `${labels.weekly} · ${weekday} · ${reminder.time}`;
  }
  if (reminder.interval === "monthly") {
    return `${labels.monthly} · ${d} число · ${reminder.time}`;
  }
  return `${labels.daily} · ${reminder.time}`;
}

export function serializeReminder(row: {
  id: string;
  message: string;
  time: string;
  startDate: Date;
  interval: string;
  timezone: string;
  enabled: boolean;
  lastTriggeredAt: Date | null;
}): ReminderRecord {
  return {
    id: row.id,
    message: row.message,
    time: row.time,
    startDate: formatDateOnly(row.startDate),
    interval: row.interval as ReminderInterval,
    timezone: row.timezone,
    enabled: row.enabled,
    lastTriggeredAt: row.lastTriggeredAt?.toISOString() ?? null,
  };
}

export function parseStartDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}
