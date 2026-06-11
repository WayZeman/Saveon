"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { formatGoalDeadlineInput } from "@/lib/goal-dates";
import type { Goal } from "@/contexts/DataContext";

type GoalDisplay = {
  balanceUsed: number;
  remainingNeeded: number;
  progressPercent: number;
};

type GoalCardProps = {
  goal: Goal;
  display: GoalDisplay;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  formatMoney: (n: number) => string;
  t: (key: string, ...args: string[]) => string;
  onEdit: () => void;
  onDelete: () => void;
  onRealize: () => void;
  onSaveDetails: (data: { description?: string | null; deadline?: string | null }) => Promise<void>;
};

function formatDeadlineLabel(deadline: string | null, t: GoalCardProps["t"]): string | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  const dateLabel = end.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
  if (days < 0) return `${dateLabel} · ${t("goals_overdue")}`;
  if (days === 0) return `${dateLabel} · ${t("goals_today")}`;
  return `${dateLabel} · ${t("goals_daysLeft", String(days))}`;
}

export function GoalCard({
  goal,
  display,
  expanded,
  onToggle,
  canEdit,
  formatMoney,
  t,
  onEdit,
  onDelete,
  onRealize,
  onSaveDetails,
}: GoalCardProps) {
  const { balanceUsed, remainingNeeded, progressPercent } = display;
  const hasEnough = remainingNeeded <= 0;
  const [description, setDescription] = useState(goal.description ?? "");
  const [deadline, setDeadline] = useState(formatGoalDeadlineInput(goal.deadline));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(goal.description ?? "");
    setDeadline(formatGoalDeadlineInput(goal.deadline));
  }, [goal.id, goal.description, goal.deadline]);

  const deadlineLabel = formatDeadlineLabel(goal.deadline, t);
  const isOverdue =
    goal.deadline &&
    !Number.isNaN(new Date(goal.deadline).getTime()) &&
    new Date(goal.deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  async function saveDescription() {
    const next = description.trim() || null;
    const current = goal.description?.trim() || null;
    if (next === current) return;
    setSaving(true);
    try {
      await onSaveDetails({ description: next });
    } finally {
      setSaving(false);
    }
  }

  async function saveDeadline(next: string) {
    const normalized = next || null;
    const current = formatGoalDeadlineInput(goal.deadline) || null;
    if (normalized === current) return;
    setSaving(true);
    try {
      await onSaveDetails({ deadline: normalized });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 transition-colors hover:bg-[var(--input-bg)]/40"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[15px] truncate text-[var(--text)]">{goal.title}</h2>
              {hasEnough && !expanded && (
                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                  {t("goals_enough")}
                </span>
              )}
            </div>
            {!expanded && deadlineLabel && (
              <p className={`mt-0.5 text-[11px] truncate ${isOverdue ? "text-[var(--accent-red)]" : "text-[var(--text-tertiary)]"}`}>
                {deadlineLabel}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--text-secondary)]">
            {(progressPercent ?? 0).toFixed(0)}%
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </div>
        <div className="mt-2.5 h-1 bg-[var(--input-bg)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-blue)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent ?? 0}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 animate-slide-up">
          <div className="flex items-end justify-between gap-4 text-[13px]">
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("goals_onBalance")}</p>
              <p className="mt-0.5 font-medium tabular-nums">{formatMoney(balanceUsed)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("goals_remaining")}</p>
              <p className="mt-0.5 font-medium tabular-nums">{formatMoney(remainingNeeded)}</p>
            </div>
          </div>

          <p className="text-[12px] text-[var(--text-secondary)]">
            {formatMoney(goal.targetAmount)} · {goal.isShared ? t("goals_sharedShort") : t("goals_personal")}
          </p>

          <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
            {t("goals_categoriesLabel")}:{" "}
            {(goal.sourceCategories ?? []).length > 0
              ? goal.sourceCategories.map((c) => c.name).join(", ")
              : t("goals_allCategoriesFallback")}
          </p>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1.5">{t("goals_description")}</label>
            {canEdit ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => void saveDescription()}
                placeholder={t("goals_descriptionPlaceholder")}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)]/50"
              />
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {goal.description?.trim() || t("goals_noDescription")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`goal-deadline-${goal.id}`} className="block text-[11px] text-[var(--text-tertiary)] mb-1.5">
              {t("goals_deadline")}
            </label>
            {canEdit ? (
              <div className="flex items-center gap-2">
                <input
                  id={`goal-deadline-${goal.id}`}
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDeadline(next);
                    void saveDeadline(next);
                  }}
                  className="flex-1 min-w-0"
                />
                {deadline && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeadline("");
                      void saveDeadline("");
                    }}
                    className="shrink-0 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-2 py-1"
                  >
                    {t("goals_clearDeadline")}
                  </button>
                )}
              </div>
            ) : deadlineLabel ? (
              <p className={`text-[13px] ${isOverdue ? "text-[var(--accent-red)]" : "text-[var(--text-secondary)]"}`}>
                {deadlineLabel}
              </p>
            ) : (
              <p className="text-[13px] text-[var(--text-tertiary)]">{t("goals_noDeadline")}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {hasEnough && (
              <button
                type="button"
                onClick={onRealize}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition inline-flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                {t("goals_realize")}
              </button>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg px-3 py-2 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition inline-flex items-center gap-1.5 text-[13px] font-medium"
                >
                  <Pencil className="w-4 h-4" strokeWidth={2} />
                  {t("goals_edit")}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg px-3 py-2 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition inline-flex items-center gap-1.5 text-[13px] font-medium"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                  {t("goals_delete")}
                </button>
              </>
            )}
            {saving && <span className="text-[11px] text-[var(--text-tertiary)] self-center">{t("goals_saving")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
