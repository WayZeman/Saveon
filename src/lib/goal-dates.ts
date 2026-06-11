export function parseGoalDeadline(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

export function formatGoalDeadlineInput(deadline: Date | string | null | undefined): string {
  if (!deadline) return "";
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
