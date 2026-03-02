"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Wallet, Target, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { AnimatedNumber } from "@/components/AnimatedNumber";

async function realizeGoal(goalId: string): Promise<boolean> {
  const res = await fetch(`/api/goals/${goalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ realize: true }),
  });
  return res.ok;
}

const COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff453a", "#bf5af2", "#ff375f", "#64d2ff", "#ac8e68"];

const PALE_RED = "#e57373";

function formatAxisShort(valueUah: number, currency: string, rates: { usd: number; eur: number } | null): string {
  let v = valueUah;
  if (currency === "USD" && rates) v = valueUah / rates.usd;
  else if (currency === "EUR" && rates) v = valueUah / rates.eur;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(v));
}

export default function HomePageContent() {
  const { formatMoney, currency, rates } = useCurrency();
  const { t } = useLanguage();
  const { dashboardData: data, user, initialLoadDone, refetchDashboard, refetchGoals } = useData();
  const [realizingId, setRealizingId] = useState<string | null>(null);

  if (!initialLoadDone || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-8 h-8 border-2 border-[var(--text-tertiary)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin" style={{ animationDuration: "0.8s" }} />
        <p className="text-[13px] text-[var(--text-tertiary)] animate-pulse">{t("home_loading")}</p>
      </div>
    );
  }

  const hasPartner = data.hasPartner;
  const partnerLabel = user?.role === "husband" ? t("home_partnerBalanceWife") : user?.role === "wife" ? t("home_partnerBalanceHusband") : t("home_partnerBalance");

  return (
    <div className="section-spacing max-w-6xl mx-auto">
      {/* Hero balance */}
      <section className="rounded-3xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] px-6 pt-7 pb-10 md:px-10 md:pt-9 md:pb-14 relative overflow-hidden shadow-glow opacity-0 animate-in">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
        </div>
        <div className="flex items-center gap-2 text-white/70 text-[13px] md:text-[14px] font-medium relative tracking-wide uppercase">
          <Wallet className="w-4 h-4 shrink-0" strokeWidth={2} />
          {hasPartner ? t("home_totalBalance") : t("home_myBalance")}
        </div>
        <p className={`text-4xl md:text-5xl lg:text-6xl font-bold mt-3 tracking-tight relative ${data.totalBalance >= 0 ? "text-white" : "text-red-200"}`}>
          <AnimatedNumber
            value={data.totalBalance}
            format={(n) => formatMoney(n)}
            duration={900}
            delay={150}
            prefix={data.totalBalance >= 0 ? "" : "−"}
          />
        </p>
      </section>

      {/* Balance cards — only show when partner exists */}
      {hasPartner && (
        <section className="grid grid-cols-2 gap-3 md:gap-5">
          <BalanceCard title={t("home_myBalance")} amount={data.myBalance} formatMoney={formatMoney} className="opacity-0 animate-slide-up animate-stagger-1" />
          <BalanceCard title={partnerLabel} amount={data.partnerBalance} formatMoney={formatMoney} className="opacity-0 animate-slide-up animate-stagger-2" />
        </section>
      )}

      {/* Goals — тільки нереалізовані; "Залишилось" = загальна сума до збору мінус поточний баланс */}
      {data.goals.length > 0 && (() => {
        const totalTarget = data.goals.reduce((s, g) => s + g.targetAmount, 0);
        const totalCollected = data.totalBalance;
        const totalRemaining = Math.max(0, totalTarget - totalCollected);
        const fillPercent = totalTarget > 0 ? Math.min(100, (totalCollected / totalTarget) * 100) : 0;
        return (
          <section className="card opacity-0 animate-slide-up animate-stagger-3">
            <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
              <Target className="w-[18px] h-[18px] text-[var(--accent-purple)]" strokeWidth={2} />
              {t("home_goals")}
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">{t("home_goalsProgress")}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] mb-4">
              <span className="text-[var(--text-secondary)]">{t("home_needed")} <span className="text-[var(--text)] font-medium">{formatMoney(totalTarget)}</span></span>
              <span className="text-[var(--text-secondary)]">{t("home_collected")} <span className="text-[var(--accent-green)] font-medium">{formatMoney(totalCollected)}</span></span>
            </div>
            <div className="h-2.5 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--border-strong)]">
              <div className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full transition-all duration-700 ease-out" style={{ width: `${fillPercent}%` }} />
            </div>
            <p className="mt-2.5 text-[13px] font-medium text-[var(--text)]">{t("home_remaining")} {formatMoney(totalRemaining)}</p>
            <ul className="mt-5 space-y-2">
              {data.goals.map((goal) => {
                const hasEnough = goal.remainingNeeded <= 0;
                const isRealizing = realizingId === goal.id;
                return (
                  <li key={goal.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--input-bg)] px-4 py-3.5 border border-[var(--border)]">
                    <Link href="/goals" className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium">{goal.title}</span>
                    </Link>
                    {hasEnough ? (
                      <button
                        type="button"
                        disabled={!!realizingId}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (realizingId) return;
                          setRealizingId(goal.id);
                          const ok = await realizeGoal(goal.id);
                          setRealizingId(null);
                          if (ok) {
                            await Promise.all([refetchGoals(), refetchDashboard()]);
                          }
                        }}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white bg-[var(--accent-blue)] hover:brightness-110 disabled:opacity-60 transition"
                      >
                        {isRealizing ? "..." : t("home_realize")}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[13px] font-medium text-[var(--accent-orange)]">{t("home_remaining")} {formatMoney(goal.remainingNeeded)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <Link href="/goals" className="inline-block mt-5 text-[13px] font-medium text-[var(--accent-blue)] hover:underline">{t("home_allGoals")}</Link>
          </section>
        );
      })()}

      {data.goals.length === 0 && (
        <section className="card opacity-0 animate-slide-up animate-stagger-3 text-center py-10">
          <Target className="w-10 h-10 mx-auto mb-3 text-[var(--accent-green)]" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold mb-1.5">{t("home_noGoals")}</h2>
          <p className="text-[var(--text-secondary)] text-[15px]">{t("home_noGoalsHint")}</p>
          <Link href="/goals" className="inline-block mt-6 rounded-xl bg-[var(--accent-blue)] text-white px-6 py-3 text-[14px] font-semibold hover:brightness-110 transition">{t("home_addGoal")}</Link>
        </section>
      )}

      {/* По категоріях — відсотки на діаграмі з полосками, minAngle щоб малі не налазили */}
      <section className="card opacity-0 animate-slide-up animate-stagger-4">
        <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="w-[18px] h-[18px] text-[var(--accent-blue)]" strokeWidth={2} />
          {t("home_byCategory")}
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">{t("home_byCategoryHint")}</p>
        {data.pieData.length > 0 ? (
          <>
            <div className="h-48 md:h-56 categories-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <Pie
                    data={data.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={62}
                    paddingAngle={2}
                    minAngle={5}
                    dataKey="value"
                    nameKey="name"
                    stroke="var(--bg)"
                    strokeWidth={1}
                    labelLine={{ stroke: "var(--text-tertiary)", strokeWidth: 1 }}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {data.pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [formatMoney(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-4">
              {data.pieData.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 h-0.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden />
                  <span className="flex-1 min-w-0 text-[var(--text)] truncate">{item.name}</span>
                  <span className="text-[var(--text-secondary)] shrink-0">{formatMoney(item.value)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="py-12 text-center text-[var(--text-tertiary)] text-[14px]">{t("home_noDataPeriod")}</div>
        )}
      </section>

      <section className="card opacity-0 animate-slide-up animate-stagger-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-[18px] h-[18px] text-[var(--accent-green)]" strokeWidth={2} />
              {t("home_incomeExpense")}
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{t("home_incomeExpenseHint")}</p>
          </div>
        </div>

        {/* Summary row */}
        {data.monthlyData.length > 0 && (() => {
          const totalIncome = data.monthlyData.reduce((s, d) => s + d.income, 0);
          const totalExpense = data.monthlyData.reduce((s, d) => s + d.expense, 0);
          return (
            <div className="flex gap-4 mb-5 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]">
              <div className="flex-1">
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">{t("home_income")}</p>
                <p className="text-[15px] font-semibold text-[var(--accent-green)]">{formatMoney(totalIncome)}</p>
              </div>
              <div className="w-px bg-[var(--border)]" />
              <div className="flex-1">
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">{t("home_expense")}</p>
                <p className="text-[15px] font-semibold text-[var(--text-secondary)]">{formatMoney(totalExpense)}</p>
              </div>
            </div>
          );
        })()}

        {/* Chart: cumulative balance (фіксований протягом часу) + income/expense areas */}
        {data.monthlyData.length > 0 && (() => {
          let running = 0;
          const chartData = data.monthlyData.map((d) => {
            running += d.income - d.expense;
            return { ...d, balance: running };
          });
          return (
            <>
              <div className="h-48 md:h-56 chart-minimal -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALE_RED} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={PALE_RED} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickFormatter={(v) => (typeof v === "string" ? v.slice(-2) : v)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickFormatter={(v) => formatAxisShort(v, currency, rates)}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", padding: "8px 12px" }}
                      formatter={(value: number, name: string) => [formatMoney(value), name]}
                      cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 2" }}
                    />
                    {/* Expense — блідо-червона, ззаду */}
                    <Area type="monotone" dataKey="expense" stroke={PALE_RED} strokeWidth={1.5} fill="url(#expenseGrad)" strokeLinecap="round" name={t("home_expense")} isAnimationActive dot={false} activeDot={{ r: 4, fill: PALE_RED, strokeWidth: 0 }} />
                    {/* Income — зелений */}
                    <Area type="monotone" dataKey="income" stroke="var(--accent-green)" strokeWidth={2} fill="url(#incomeGrad)" strokeLinecap="round" name={t("home_income")} isAnimationActive dot={false} activeDot={{ r: 4, fill: "var(--accent-green)", strokeWidth: 0 }} />
                    {/* Баланс накопичувальний — не падає якщо не поповнював (як Interactive Brokers) */}
                    <Line type="monotone" dataKey="balance" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent-blue)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--accent-blue)", strokeWidth: 2, stroke: "var(--bg)" }} name={t("home_balanceChart")} isAnimationActive connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 mt-4 pt-3 border-t border-[var(--border)] flex-wrap">
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                  <span className="w-6 h-0.5 rounded-full bg-[var(--accent-blue)] inline-block" />
                  {t("home_balanceChart")}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                  <span className="w-6 h-0.5 rounded-full bg-[var(--accent-green)] inline-block" />
                  {t("home_income")}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                  <span className="w-6 h-0.5 rounded-full inline-block" style={{ backgroundColor: PALE_RED }} />
                  {t("home_expense")}
                </div>
              </div>
            </>
          );
        })()}
      </section>
    </div>
  );
}

function BalanceCard({ title, amount, formatMoney, className = "" }: {
  title: string; amount: number; formatMoney: (n: number) => string; className?: string;
}) {
  return (
    <div className={`card flex flex-col justify-center transition-transform hover:scale-[1.01] ${className}`}>
      <p className="text-[13px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
        <Wallet className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        {title}
      </p>
      <p className={`text-xl md:text-2xl font-semibold mt-2 tracking-tight ${amount >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
        <AnimatedNumber
          value={amount}
          format={formatMoney}
          duration={600}
          delay={amount >= 0 ? 120 : 180}
          prefix={amount >= 0 ? "" : "−"}
        />
      </p>
    </div>
  );
}
