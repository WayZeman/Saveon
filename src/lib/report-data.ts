import type { SessionUser } from "./auth";
import { prisma } from "./prisma";
import { goalsVisibleWhere, transactionUserIds } from "./data-scope";
import { goalListInclude } from "./goal-api";
import {
  buildCategoryNetsByUser,
  computeGoalProgress,
  mapGoalSourceCategories,
} from "./goal-balance";
import type { ReportPeriod } from "./report-period";
import { transactionInclude } from "./transaction-include";

export type ReportCategoryRow = {
  name: string;
  income: number;
  expense: number;
  net: number;
};

export type ReportTransactionRow = {
  date: Date;
  type: "income" | "expense";
  categoryName: string;
  sourceCategoryName: string | null;
  amount: number;
  ownerLabel: string;
};

export type ReportGoalRow = {
  title: string;
  targetAmount: number;
  balanceUsed: number;
  progressPercent: number;
};

export type ReportData = {
  userName: string;
  userEmail: string;
  hasPartner: boolean;
  periodFrom: Date;
  periodTo: Date;
  generatedAt: Date;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  categoryRows: ReportCategoryRow[];
  transactions: ReportTransactionRow[];
  goals: ReportGoalRow[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function ownerLabel(
  userId: string,
  sessionId: string,
  users: Map<string, { name: string; role: string }>
): string {
  if (userId === sessionId) return "Я";
  const u = users.get(userId);
  if (!u) return "Партнер";
  if (u.name.trim()) return u.name.trim();
  if (u.role === "husband") return "Чоловік";
  if (u.role === "wife") return "Дружина";
  return "Партнер";
}

export async function fetchReportData(session: SessionUser, period: ReportPeriod): Promise<ReportData> {
  const userIds = transactionUserIds(session);
  const partnerId = session.partnerId ?? null;

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, email: true, partnerId: true },
  });

  const usersRaw = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const users = new Map(usersRaw.map((u) => [u.id, u]));

  const periodTransactions = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: period.from, lte: period.to },
    },
    orderBy: { createdAt: "desc" },
    include: transactionInclude,
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = new Map<string, ReportCategoryRow>();

  function bumpCategory(name: string, income: number, expense: number) {
    const key = name || "Інше";
    const row = categoryMap.get(key) ?? { name: key, income: 0, expense: 0, net: 0 };
    row.income += income;
    row.expense += expense;
    row.net = row.income - row.expense;
    categoryMap.set(key, row);
  }

  const transactions: ReportTransactionRow[] = periodTransactions.map((t) => {
    const type = t.type as "income" | "expense";
    if (type === "income") {
      totalIncome += t.amount;
      bumpCategory(t.category.name, t.amount, 0);
    } else {
      totalExpense += t.amount;
      const sourceName = t.sourceCategory?.name ?? t.category.name;
      bumpCategory(sourceName, 0, t.amount);
    }

    return {
      date: t.createdAt,
      type,
      categoryName: t.category.name,
      sourceCategoryName: t.sourceCategory?.name ?? null,
      amount: t.amount,
      ownerLabel: ownerLabel(t.userId, session.id, users),
    };
  });

  const categoryRows = Array.from(categoryMap.values())
    .map((r) => ({
      ...r,
      income: round2(r.income),
      expense: round2(r.expense),
      net: round2(r.net),
    }))
    .filter((r) => r.income > 0 || r.expense > 0)
    .sort((a, b) => b.net - a.net);

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      type: true,
      amount: true,
      categoryId: true,
      sourceCategoryId: true,
      category: { select: { id: true } },
      sourceCategory: { select: { id: true } },
    },
  });

  const byUser: Record<string, { income: number; expense: number }> = {};
  for (const uid of userIds) byUser[uid] = { income: 0, expense: 0 };
  for (const t of allTransactions) {
    const agg = byUser[t.userId];
    if (!agg) continue;
    if (t.type === "income") agg.income += t.amount;
    else agg.expense += t.amount;
  }
  const myBalance = (byUser[session.id]?.income ?? 0) - (byUser[session.id]?.expense ?? 0);
  const partnerBalance = partnerId
    ? (byUser[partnerId]?.income ?? 0) - (byUser[partnerId]?.expense ?? 0)
    : 0;
  const totalBalance = myBalance + partnerBalance;
  const fallback = { myBalance, totalBalance };

  const categoryNetsByUser = buildCategoryNetsByUser(allTransactions, userIds);

  const goalsRaw = await prisma.goal.findMany({
    where: { ...goalsVisibleWhere(session), realizedAt: null },
    orderBy: { createdAt: "desc" },
    include: goalListInclude,
  });

  const goals: ReportGoalRow[] = goalsRaw.map((g) => {
    const progress = computeGoalProgress(g, categoryNetsByUser, session.id, partnerId, fallback);
    return {
      title: mapGoalSourceCategories(g).title,
      targetAmount: g.targetAmount,
      balanceUsed: round2(Math.min(progress.balanceUsed, g.targetAmount)),
      progressPercent: round2(progress.progressPercent),
    };
  });

  return {
    userName: me?.name?.trim() || me?.email || "Користувач",
    userEmail: me?.email ?? "",
    hasPartner: !!partnerId,
    periodFrom: period.from,
    periodTo: period.to,
    generatedAt: new Date(),
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    netChange: round2(totalIncome - totalExpense),
    categoryRows,
    transactions,
    goals,
  };
}
