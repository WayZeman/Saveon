"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { formatGoalDeadlineInput } from "@/lib/goal-dates";
import { GoalProgressRing } from "@/components/GoalProgressRing";
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
  accent: "blue" | "purple" | "teal";
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
  const dateLabel = end.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
  if (days < 0) return `${dateLabel} · ${t("goals_overdue")}`;
  if (days === 0) return `${dateLabel} · ${t("goals_today")}`;
  return `${dateLabel} · ${t("goals_daysLeft", String(days))}`;
}

function formatDeadlineLong(deadline: string | null): string | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  return end.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

export function GoalCard({
  goal,
  display,
  expanded,
  accent,
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
  const pct = progressPercent ?? 0;
  const hasEnough = remainingNeeded <= 0;
  const [description, setDescription] = useState(goal.description ?? "");
  const [deadline, setDeadline] = useState(formatGoalDeadlineInput(goal.deadline));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(goal.description ?? "");
    setDeadline(formatGoalDeadlineInput(goal.deadline));
  }, [goal.id, goal.description, goal.deadline]);

  const deadlineShort = formatDeadlineLabel(goal.deadline, t);
  const deadlineLong = formatDeadlineLong(goal.deadline);
  const isOverdue =
    goal.deadline &&
    !Number.isNaN(new Date(goal.deadline).getTime()) &&
    new Date(goal.deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  const categories = goal.sourceCategories ?? [];

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
    <article
      className={`goal-card card !p-0 overflow-hidden transition-all duration-300 ${expanded ? "goal-card--expanded" : ""}`}
      data-accent={accent}
    >
      <button
        type="button"
        onClick={onToggle}
        className="goal-card-trigger relative z-[1] w-full text-left px-4 py-4 sm:px-5"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          <GoalProgressRing percent={pct} accent={accent} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[15px] sm:text-[16px] truncate text-[var(--text)] tracking-tight">
                {goal.title}
              </h2>
              {hasEnough && (
                <span className="goal-chip goal-chip--ready shrink-0">{t("goals_enough")}</span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)] tabular-nums">
              {formatMoney(balanceUsed)}
              <span className="text-[var(--text-tertiary)]"> / {formatMoney(goal.targetAmount)}</span>
            </p>
            {!expanded && deadlineShort && (
              <p className={`mt-1.5 text-[11px] truncate ${isOverdue ? "text-[var(--accent-red)]" : "text-[var(--text-tertiary)]"}`}>
                <Calendar className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" strokeWidth={2} />
                {deadlineShort}
              </p>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </div>
      </button>

      {expanded && (
        <div className="goal-card-details relative z-[1] px-4 pb-5 sm:px-5 animate-slide-up">
          <div className="flex flex-wrap items-center gap-2">
            <span className="goal-chip">{goal.isShared ? t("goals_sharedShort") : t("goals_personal")}</span>
            {categories.map((c) => (
              <span key={c.id} className="goal-chip goal-chip--muted">
                {c.name}
              </span>
            ))}
            {categories.length === 0 && (
              <span className="goal-chip goal-chip--muted">{t("goals_allCategoriesFallback")}</span>
            )}
          </div>

          <div className="goal-detail-block mt-4">
            <p className="goal-detail-label mb-2">{t("goals_description")}</p>
            {canEdit ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => void saveDescription()}
                placeholder={t("goals_descriptionPlaceholder")}
                rows={3}
                className="goal-detail-textarea"
              />
            ) : (
              <p className="goal-detail-text">
                {goal.description?.trim() || t("goals_noDescription")}
              </p>
            )}
          </div>

          <div className="goal-detail-block mt-3">
            <p className="goal-detail-label mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              {t("goals_deadline")}
            </p>
            {canEdit ? (
              <div className="goal-date-row">
                <input
                  id={`goal-deadline-${goal.id}`}
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDeadline(next);
                    void saveDeadline(next);
                  }}
                  className="goal-date-input"
                />
                {deadline && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeadline("");
                      void saveDeadline("");
                    }}
                    className="goal-date-clear"
                  >
                    {t("goals_clearDeadline")}
                  </button>
                )}
              </div>
            ) : deadlineLong ? (
              <p className={`goal-detail-text ${isOverdue ? "text-[var(--accent-red)]" : ""}`}>
                {deadlineLong}
                {deadlineShort && (
                  <span className="block text-[12px] text-[var(--text-tertiary)] mt-0.5">{deadlineShort}</span>
                )}
              </p>
            ) : (
              <p className="goal-detail-text text-[var(--text-tertiary)]">{t("goals_noDeadline")}</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2 pt-4 border-t border-[var(--border)]">
            {hasEnough && (
              <button type="button" onClick={onRealize} className="goal-action goal-action--primary">
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                {t("goals_realize")}
              </button>
            )}
            {canEdit && (
              <>
                <button type="button" onClick={onEdit} className="goal-action">
                  <Pencil className="w-4 h-4" strokeWidth={2} />
                  {t("goals_edit")}
                </button>
                <button type="button" onClick={onDelete} className="goal-action goal-action--danger">
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                  {t("goals_delete")}
                </button>
              </>
            )}
            {saving && <span className="text-[11px] text-[var(--text-tertiary)] self-center px-2">{t("goals_saving")}</span>}
          </div>
        </div>
      )}
    </article>
  );
}
