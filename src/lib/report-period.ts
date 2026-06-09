const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ReportPeriod = { from: Date; to: Date };

export function parseReportPeriod(fromStr: string | null, toStr: string | null): ReportPeriod | { error: string } {
  if (!fromStr || !toStr) {
    return { error: "Вкажіть дати початку та кінця періоду" };
  }
  if (!DATE_RE.test(fromStr) || !DATE_RE.test(toStr)) {
    return { error: "Невірний формат дати (очікується YYYY-MM-DD)" };
  }

  const from = new Date(`${fromStr}T00:00:00.000`);
  const to = new Date(`${toStr}T23:59:59.999`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Невірна дата" };
  }
  if (from > to) {
    return { error: "Дата початку не може бути пізніше дати кінця" };
  }

  const maxDays = 366;
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > maxDays) {
    return { error: `Максимальний період — ${maxDays} днів` };
  }

  return { from, to };
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfPreviousMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

export function endOfPreviousMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);
}

export function monthsAgoStart(months: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - months + 1, 1);
}
