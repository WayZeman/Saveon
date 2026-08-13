"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Percent, PiggyBank, TrendingDown, TrendingUp, Sparkles, AlertTriangle, Layers } from "lucide-react";
import type { AnalyticsInsight, SavingsAnalytics } from "@/lib/savings-analytics";
import { formatAnalyticsMonth } from "@/lib/savings-analytics";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type Props = {
  analytics: SavingsAnalytics;
  formatMoney: (n: number) => string;
  t: (key: string, ...args: string[]) => string;
};

function insightCopy(insight: AnalyticsInsight, formatMoney: Props["formatMoney"], t: Props["t"]): string {
  switch (insight.kind) {
    case "high_rate":
      return t("analytics_insightHighRate", String(Math.round(insight.rate)));
    case "low_rate":
      return t("analytics_insightLowRate", String(Math.round(insight.rate)));
    case "saved_more":
      return t("analytics_insightSavedMore", formatMoney(insight.delta));
    case "saved_less":
      return t("analytics_insightSavedLess", formatMoney(insight.delta));
    case "pace_goals":
      return t("analytics_insightPaceGoals", String(insight.months));
    case "pace_stalled":
      return t("analytics_insightPaceStalled");
    case "goals_ready":
      return t("analytics_insightGoalsReady");
    case "concentration":
      return t("analytics_insightConcentration", insight.category, `${Math.round(insight.share)}%`);
  }
}

function insightIcon(kind: AnalyticsInsight["kind"]) {
  if (kind === "high_rate" || kind === "saved_more" || kind === "goals_ready") {
    return <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-green)]" strokeWidth={2} />;
  }
  if (kind === "low_rate" || kind === "saved_less" || kind === "pace_stalled") {
    return <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-orange)]" strokeWidth={2} />;
  }
  if (kind === "concentration") {
    return <Layers className="w-3.5 h-3.5 text-[var(--accent-purple)]" strokeWidth={2} />;
  }
  return <Sparkles className="w-3.5 h-3.5 text-[var(--accent-blue)]" strokeWidth={2} />;
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate)}%`;
}

export function SavingsAnalyticsCard({ analytics, formatMoney, t }: Props) {
  const current = analytics.currentMonth;
  const rate = current?.savingsRate ?? analytics.trailing.savingsRate;
  const savedThisMonth = current?.saved ?? 0;
  const avg = analytics.trailing.avgMonthlySaved;
  const delta = analytics.savedDelta;
  const deltaPositive = delta != null && delta >= 0;

  return (
    <section className="card opacity-0 animate-slide-up animate-stagger-3">
      <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
        <PiggyBank className="w-[18px] h-[18px] text-[var(--accent-green)]" strokeWidth={2} />
        {t("analytics_title")}
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">{t("analytics_hint")}</p>

      {!analytics.hasActivity ? (
        <p className="py-8 text-center text-[14px] text-[var(--text-tertiary)]">{t("analytics_empty")}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Kpi
              icon={<Percent className="w-3.5 h-3.5" strokeWidth={2} />}
              label={t("analytics_savingsRate")}
              value={formatRate(rate)}
              hint={t("analytics_thisMonth")}
            />
            <Kpi
              icon={<PiggyBank className="w-3.5 h-3.5" strokeWidth={2} />}
              label={t("analytics_savedMonth")}
              value={
                <AnimatedNumber
                  value={savedThisMonth}
                  format={formatMoney}
                  duration={600}
                  prefix={savedThisMonth >= 0 ? "" : "−"}
                />
              }
              hint={
                delta == null
                  ? t("analytics_thisMonth")
                  : t(deltaPositive ? "analytics_vsLastMore" : "analytics_vsLastLess", formatMoney(Math.abs(delta)))
              }
              valueClass={savedThisMonth >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}
            />
            <Kpi
              icon={<TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />}
              label={t("analytics_avgMonth")}
              value={
                <AnimatedNumber
                  value={avg}
                  format={formatMoney}
                  duration={600}
                  prefix={avg >= 0 ? "" : "−"}
                />
              }
              hint={t("analytics_avgHint", String(analytics.trailing.activeMonths || 12))}
              valueClass={avg >= 0 ? "text-[var(--text)]" : "text-[var(--accent-red)]"}
            />
          </div>

          {analytics.monthlyBars.some((b) => Math.abs(b.saved) >= 0.005) && (
            <div className="mt-5 h-20 chart-minimal -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyBars} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-tertiary)", fontSize: 9 }}
                    tickFormatter={formatAnalyticsMonth}
                    interval="preserveStartEnd"
                    minTickGap={8}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    formatter={(value: number) => [formatMoney(value), t("analytics_savedMonth")]}
                    labelFormatter={(label) => formatAnalyticsMonth(String(label))}
                    cursor={{ fill: "var(--input-bg)" }}
                  />
                  <Bar dataKey="saved" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {analytics.monthlyBars.map((entry, i) => (
                      <Cell
                        key={`${entry.month}-${i}`}
                        fill={entry.saved >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
                        fillOpacity={i === analytics.monthlyBars.length - 1 ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {analytics.insights.length > 0 && (
            <ul className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-4">
              {analytics.insights.map((insight, i) => (
                <li key={`${insight.kind}-${i}`} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                  <span className="mt-0.5 shrink-0">{insightIcon(insight.kind)}</span>
                  <span>{insightCopy(insight, formatMoney, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  valueClass = "text-[var(--text)]",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--input-bg)] border border-[var(--border)] px-2.5 py-3 sm:px-4 sm:py-3.5 min-w-0">
      <p className="flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
        <span className="hidden sm:inline-flex text-[var(--text-tertiary)]">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      <p className={`text-[15px] sm:text-[18px] font-semibold tabular-nums tracking-tight truncate ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-tertiary)] truncate">{hint}</p>
    </div>
  );
}
