"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Wallet, Target, PieChart as PieChartIcon } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useHomeSections } from "@/contexts/HomeSectionsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { FearGreedIndex } from "@/components/FearGreedIndex";
import { NewsSection } from "@/components/NewsSection";
import { RealizeGoalModal, type RealizeGoalInfo } from "@/components/RealizeGoalModal";
import { filterPrimaryCategories } from "@/lib/category-tier";

const COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff453a", "#bf5af2", "#ff375f", "#64d2ff", "#ac8e68"];

export default function HomePageContent() {
  const { formatMoney } = useCurrency();
  const { showFearGreed, showMarketNews } = useHomeSections();
  const { t } = useLanguage();
  const { dashboardData: data, user, categories, initialLoadDone, refetchDashboard, refetchGoals } = useData();
  const [realizeGoal, setRealizeGoal] = useState<RealizeGoalInfo | null>(null);
  const primaryCategories = filterPrimaryCategories(categories);

  async function confirmRealizeGoal(goalId: string, sourceCategoryId: string): Promise<boolean> {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realize: true, sourceCategoryId }),
    });
    if (res.ok) {
      setRealizeGoal(null);
      await Promise.all([refetchGoals(), refetchDashboard()]);
      return true;
    }
    return false;
  }

  if (!initialLoadDone || !data) {
    return (
      <div className="section-spacing max-w-6xl mx-auto min-h-[110vh]">
        <div className="h-44 rounded-[1.8rem] bg-[var(--input-bg)]/60 animate-pulse border border-[var(--border)]" />
        <div className="card !p-5 animate-pulse">
          <div className="h-5 w-40 rounded bg-[var(--input-bg)] mb-3" />
          <div className="h-3 w-56 rounded bg-[var(--input-bg)]/80 mb-4" />
          <div className="h-2.5 w-full rounded bg-[var(--input-bg)]" />
          <div className="mt-4 space-y-2">
            <div className="h-10 rounded-xl bg-[var(--input-bg)]/80" />
            <div className="h-10 rounded-xl bg-[var(--input-bg)]/80" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 pb-6">
          <p className="text-[13px] text-[var(--text-tertiary)] animate-pulse">{t("home_loading")}</p>
          <div className="w-7 h-7 border-2 border-[var(--text-tertiary)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin" style={{ animationDuration: "0.8s" }} />
        </div>
      </div>
    );
  }

  const hasPartner = data.hasPartner;
  const partnerLabel = user?.role === "husband" ? t("home_partnerBalanceWife") : user?.role === "wife" ? t("home_partnerBalanceHusband") : t("home_partnerBalance");

  return (
    <div className="section-spacing max-w-6xl mx-auto">
      {/* Hero balance */}
      <section className="rounded-[1.8rem] bg-gradient-to-br from-[#0c7ff5] to-[#4e6cff] px-6 pt-7 pb-10 md:px-10 md:pt-9 md:pb-12 relative overflow-hidden shadow-glow opacity-0 animate-in border border-white/15">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
        </div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_68%)]" />
        <div className="flex items-center gap-2 text-white/75 text-[12px] md:text-[13px] font-medium relative tracking-[0.08em] uppercase">
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
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
          <BalanceCard title={t("home_myBalance")} amount={data.myBalance} formatMoney={formatMoney} className="opacity-0 animate-slide-up animate-stagger-1" />
          <BalanceCard title={partnerLabel} amount={data.partnerBalance} formatMoney={formatMoney} className="opacity-0 animate-slide-up animate-stagger-2" />
        </section>
      )}

      {/* По категоріях — відсотки на діаграмі з полосками, minAngle щоб малі не налазили */}
      <section className="card opacity-0 animate-slide-up animate-stagger-3">
        <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="w-[18px] h-[18px] text-[var(--accent-blue)]" strokeWidth={2} />
          {t("home_byCategory")}
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">{t("home_byCategoryHint")}</p>
        {(data.categoryBreakdown?.length ?? data.pieData.length) > 0 ? (
          <>
            {data.pieData.length > 0 && (
              <div className="h-56 md:h-64 categories-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                    <Pie
                      data={data.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={74}
                      paddingAngle={2}
                      minAngle={5}
                      dataKey="chartValue"
                      nameKey="name"
                      stroke="var(--bg)"
                      strokeWidth={1}
                      labelLine={{ stroke: "var(--text-tertiary)", strokeWidth: 1 }}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      isAnimationActive={false}
                    >
                      {data.pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "12px" }}
                      formatter={(_chartValue: number, _name: string, item: { payload?: { value?: number; name?: string } }) => [formatMoney(item?.payload?.value ?? 0), item?.payload?.name ?? ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className={`space-y-2.5 border-t border-[var(--border)] pt-4 ${data.pieData.length > 0 ? "mt-5" : ""}`}>
              {(data.categoryBreakdown ?? data.pieData.map((p) => ({ name: p.name, net: p.value }))).map((item, i) => {
                const colorIndex = data.pieData.findIndex((p) => p.name === item.name);
                const color = colorIndex >= 0 ? COLORS[colorIndex % COLORS.length] : "var(--text-tertiary)";
                return (
                  <li key={`${item.name}-${i}`} className="flex items-center gap-3 text-[13px]">
                    <span className="w-5 h-0.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    <span className="flex-1 min-w-0 text-[var(--text)] truncate">{item.name}</span>
                    <span className={`shrink-0 font-medium ${item.net >= 0 ? "text-[var(--text-secondary)]" : "text-[var(--accent-red)]"}`}>
                      {item.net >= 0 ? "" : "−"}{formatMoney(Math.abs(item.net))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="py-12 text-center text-[var(--text-tertiary)] text-[14px]">{t("home_noDataPeriod")}</div>
        )}
      </section>

      {/* Goals — зведення без подвійного підрахунку одних категорій між цілями */}
      {data.goals.length > 0 && (() => {
        const { totalTarget, totalCollected, totalRemaining, fillPercent } = data.goalsSummary;
        return (
          <section className="card opacity-0 animate-slide-up animate-stagger-4">
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
                return (
                  <li key={goal.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--input-bg)] px-4 py-3.5 border border-[var(--border)]">
                    <Link href="/goals" className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <span className="text-[14px] font-medium truncate">{goal.title}</span>
                      <span className="text-[13px] font-semibold text-[var(--accent-blue)] shrink-0 tabular-nums">
                        {Math.min(100, Math.max(0, goal.progressPercent)).toFixed(0)}%
                      </span>
                    </Link>
                    {hasEnough && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setRealizeGoal(goal);
                        }}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white bg-[var(--accent-blue)] hover:brightness-110 transition"
                      >
                        {t("home_realize")}
                      </button>
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
        <section className="card opacity-0 animate-slide-up animate-stagger-4 text-center py-10">
          <Target className="w-10 h-10 mx-auto mb-3 text-[var(--accent-green)]" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold mb-1.5">{t("home_noGoals")}</h2>
          <p className="text-[var(--text-secondary)] text-[15px]">{t("home_noGoalsHint")}</p>
          <Link href="/goals" className="inline-block mt-6 rounded-xl bg-[var(--accent-blue)] text-white px-6 py-3 text-[14px] font-semibold hover:brightness-110 transition">{t("home_addGoal")}</Link>
        </section>
      )}

      {showFearGreed && <FearGreedIndex />}
      {showMarketNews && <NewsSection />}

      {realizeGoal && (
        <RealizeGoalModal
          goal={realizeGoal}
          categories={
            realizeGoal.sourceCategories && realizeGoal.sourceCategories.length > 0
              ? primaryCategories.filter((c) => realizeGoal.sourceCategories!.some((s) => s.id === c.id))
              : primaryCategories
          }
          onClose={() => setRealizeGoal(null)}
          onConfirm={(sourceCategoryId) => confirmRealizeGoal(realizeGoal.id, sourceCategoryId)}
        />
      )}
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
