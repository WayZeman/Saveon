"use client";

import { Sparkles } from "lucide-react";

type GoalsSummaryProps = {
  totalTarget: number;
  totalCollected: number;
  totalRemaining: number;
  fillPercent: number;
  activeCount: number;
  formatMoney: (n: number) => string;
  t: (key: string, ...args: string[]) => string;
};

export function GoalsSummary({
  totalTarget,
  totalCollected,
  totalRemaining,
  fillPercent,
  activeCount,
  formatMoney,
  t,
}: GoalsSummaryProps) {
  return (
    <section className="goal-summary card relative overflow-hidden opacity-0 animate-slide-up">
      <div className="goal-summary-glow" aria-hidden />
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {t("goals_totalProgress")}
            </p>
            <p className="mt-1 text-[26px] font-semibold tracking-tight tabular-nums text-[var(--text)]">
              {formatMoney(totalCollected)}
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
              {t("goals_summaryOf", formatMoney(totalTarget))}
            </p>
          </div>
          <div className="goal-summary-badge">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-purple)]" strokeWidth={2} />
            <span>{t("goals_activeCount", String(activeCount))}</span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--input-bg)] overflow-hidden border border-[var(--border-strong)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-blue)] via-[var(--accent-purple)] to-[var(--accent-teal)] transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 text-[13px]">
          <span className="text-[var(--text-secondary)]">
            {t("home_collected")}{" "}
            <span className="font-medium text-[var(--accent-green)]">{formatMoney(totalCollected)}</span>
          </span>
          <span className="text-[var(--text-secondary)] text-right">
            {t("goals_remaining")}{" "}
            <span className="font-medium text-[var(--text)]">{formatMoney(totalRemaining)}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
