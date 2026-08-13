export type MonthlyPoint = { month: string; income: number; expense: number };
export type CategoryNet = { name: string; net: number };
export type GoalForForecast = { id: string; remainingNeeded: number };

export type AnalyticsInsight =
  | { kind: "high_rate"; rate: number }
  | { kind: "low_rate"; rate: number }
  | { kind: "saved_more"; delta: number }
  | { kind: "saved_less"; delta: number }
  | { kind: "pace_goals"; months: number }
  | { kind: "pace_stalled" }
  | { kind: "goals_ready" }
  | { kind: "concentration"; category: string; share: number };

export type MonthSnapshot = {
  month: string;
  income: number;
  expense: number;
  saved: number;
  savingsRate: number | null;
};

export type SavingsAnalytics = {
  currentMonth: MonthSnapshot | null;
  previousMonth: MonthSnapshot | null;
  savedDelta: number | null;
  trailing: {
    income: number;
    expense: number;
    saved: number;
    savingsRate: number | null;
    avgMonthlySaved: number;
    activeMonths: number;
  };
  bestMonth: { month: string; saved: number } | null;
  allocation: {
    topCategoryName: string | null;
    topCategoryShare: number | null;
    positiveCount: number;
  };
  monthsToAllGoals: number | null;
  goalForecasts: Record<string, number | null>;
  monthlyBars: { month: string; saved: number }[];
  insights: AnalyticsInsight[];
  hasActivity: boolean;
};

const MAX_FORECAST_MONTHS = 120;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeSavingsRate(saved: number, income: number): number | null {
  if (income <= 0) return null;
  return round2((saved / income) * 100);
}

export function monthsFromPace(remaining: number, avgMonthlySaved: number): number | null {
  if (remaining <= 0) return 0;
  if (avgMonthlySaved <= 0) return null;
  return Math.min(MAX_FORECAST_MONTHS, Math.ceil(remaining / avgMonthlySaved));
}

function snapshot(point: MonthlyPoint): MonthSnapshot {
  const saved = round2(point.income - point.expense);
  return {
    month: point.month,
    income: point.income,
    expense: point.expense,
    saved,
    savingsRate: computeSavingsRate(saved, point.income),
  };
}

function isActiveMonth(point: MonthlyPoint): boolean {
  return Math.abs(point.income) >= 0.005 || Math.abs(point.expense) >= 0.005;
}

function buildInsights(input: {
  current: MonthSnapshot | null;
  savedDelta: number | null;
  monthsToAllGoals: number | null;
  avgMonthlySaved: number;
  totalRemaining: number;
  goalCount: number;
  allocation: SavingsAnalytics["allocation"];
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const { current, savedDelta, monthsToAllGoals, avgMonthlySaved, totalRemaining, goalCount, allocation } = input;

  if (goalCount > 0 && totalRemaining <= 0) {
    insights.push({ kind: "goals_ready" });
  }

  if (current?.savingsRate != null) {
    if (current.savingsRate >= 30) insights.push({ kind: "high_rate", rate: current.savingsRate });
    else if (current.savingsRate < 10) insights.push({ kind: "low_rate", rate: current.savingsRate });
  }

  if (savedDelta != null && Math.abs(savedDelta) >= 1) {
    insights.push(
      savedDelta > 0
        ? { kind: "saved_more", delta: savedDelta }
        : { kind: "saved_less", delta: Math.abs(savedDelta) }
    );
  }

  if (goalCount > 0 && totalRemaining > 0) {
    if (monthsToAllGoals != null && monthsToAllGoals > 0) {
      insights.push({ kind: "pace_goals", months: monthsToAllGoals });
    } else if (avgMonthlySaved <= 0) {
      insights.push({ kind: "pace_stalled" });
    }
  }

  if (
    allocation.topCategoryName &&
    allocation.topCategoryShare != null &&
    allocation.topCategoryShare >= 60 &&
    allocation.positiveCount >= 2
  ) {
    insights.push({
      kind: "concentration",
      category: allocation.topCategoryName,
      share: allocation.topCategoryShare,
    });
  }

  return insights.slice(0, 3);
}

export function computeSavingsAnalytics(input: {
  monthlyData: MonthlyPoint[];
  categoryBreakdown: CategoryNet[];
  goals: GoalForForecast[];
  totalRemaining: number;
}): SavingsAnalytics {
  const monthlyData = input.monthlyData ?? [];
  const snapshots = monthlyData.map(snapshot);
  const currentMonth = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previousMonth = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const savedDelta =
    currentMonth && previousMonth ? round2(currentMonth.saved - previousMonth.saved) : null;

  const active = monthlyData.filter(isActiveMonth);
  const trailingIncome = round2(active.reduce((s, d) => s + d.income, 0));
  const trailingExpense = round2(active.reduce((s, d) => s + d.expense, 0));
  const trailingSaved = round2(trailingIncome - trailingExpense);
  const avgMonthlySaved = active.length > 0 ? round2(trailingSaved / active.length) : 0;

  let bestMonth: { month: string; saved: number } | null = null;
  for (const row of snapshots) {
    if (!isActiveMonth(row)) continue;
    if (!bestMonth || row.saved > bestMonth.saved) {
      bestMonth = { month: row.month, saved: row.saved };
    }
  }

  const positive = (input.categoryBreakdown ?? []).filter((c) => c.net > 0.005);
  const positiveTotal = positive.reduce((s, c) => s + c.net, 0);
  const top = positive[0] ?? null;
  const allocation = {
    topCategoryName: top?.name ?? null,
    topCategoryShare: top && positiveTotal > 0 ? round2((top.net / positiveTotal) * 100) : null,
    positiveCount: positive.length,
  };

  const monthsToAllGoals = monthsFromPace(input.totalRemaining, avgMonthlySaved);
  const goalForecasts: Record<string, number | null> = {};
  for (const goal of input.goals) {
    goalForecasts[goal.id] = monthsFromPace(goal.remainingNeeded, avgMonthlySaved);
  }

  const hasActivity =
    active.length > 0 ||
    positive.length > 0 ||
    input.goals.length > 0 ||
    Math.abs(input.totalRemaining) >= 0.005;

  return {
    currentMonth,
    previousMonth,
    savedDelta,
    trailing: {
      income: trailingIncome,
      expense: trailingExpense,
      saved: trailingSaved,
      savingsRate: computeSavingsRate(trailingSaved, trailingIncome),
      avgMonthlySaved,
      activeMonths: active.length,
    },
    bestMonth,
    allocation,
    monthsToAllGoals,
    goalForecasts,
    monthlyBars: snapshots.map((s) => ({ month: s.month, saved: s.saved })),
    insights: buildInsights({
      current: currentMonth,
      savedDelta,
      monthsToAllGoals,
      avgMonthlySaved,
      totalRemaining: input.totalRemaining,
      goalCount: input.goals.length,
      allocation,
    }),
    hasActivity,
  };
}

const UK_MONTHS = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];

export function formatAnalyticsMonth(month: string): string {
  const match = month.match(/(?:^|-)(\d{1,2})$/);
  if (!match) return month;
  const index = Number(match[1]) - 1;
  if (index < 0 || index > 11) return month;
  return UK_MONTHS[index];
}
