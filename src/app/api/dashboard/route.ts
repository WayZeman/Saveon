import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
type Agg = { userId: string; income: number; expense: number };

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const now = new Date();
  const y = month ? parseInt(month.split("-")[0], 10) : now.getFullYear();
  const m = month ? parseInt(month.split("-")[1], 10) : now.getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, partnerId: true },
  });

  const partnerId = me?.partnerId ?? null;
  const hasPartner = !!partnerId;
  const userIds = hasPartner ? [session.id, partnerId] : [session.id];

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, type: true, amount: true, categoryId: true },
  });
  const monthTransactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: start, lte: end } },
    select: { userId: true, type: true, amount: true, categoryId: true },
  });

  const byUser: Record<string, Agg> = {};
  for (const uid of userIds) {
    byUser[uid] = { userId: uid, income: 0, expense: 0 };
  }
  for (const t of allTransactions) {
    const agg = byUser[t.userId];
    if (agg) {
      if (t.type === "income") agg.income += t.amount;
      else agg.expense += t.amount;
    }
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.id }, { isShared: true }] },
    select: { id: true, name: true },
  });
  const categoryIds = new Set(categories.map((c) => c.id));
  const categoryTotals: Record<string, { name: string; income: number }> = {};
  for (const t of monthTransactions) {
    if (t.type !== "income" || !categoryIds.has(t.categoryId)) continue;
    const cat = categories.find((x) => x.id === t.categoryId);
    if (!cat) continue;
    if (!categoryTotals[cat.id]) categoryTotals[cat.id] = { name: cat.name, income: 0 };
    categoryTotals[cat.id].income += t.amount;
  }

  const myBalance = (byUser[session.id]?.income ?? 0) - (byUser[session.id]?.expense ?? 0);
  const partnerBalance = partnerId ? (byUser[partnerId]?.income ?? 0) - (byUser[partnerId]?.expense ?? 0) : 0;
  const totalBalance = myBalance + partnerBalance;

  const byUserMonth: Record<string, Agg> = {};
  for (const uid of userIds) {
    byUserMonth[uid] = { userId: uid, income: 0, expense: 0 };
  }
  for (const t of monthTransactions) {
    const agg = byUserMonth[t.userId];
    if (agg) {
      if (t.type === "income") agg.income += t.amount;
      else agg.expense += t.amount;
    }
  }

  const goalsRaw = await prisma.goal.findMany({
    where: { OR: [{ createdBy: session.id }, { isShared: true }] },
    orderBy: { createdAt: "desc" },
    include: { createdByUser: { select: { id: true, email: true, role: true } } },
  });

  const goalsMapped = goalsRaw.map((g) => {
    const balanceUsed = g.isShared ? totalBalance : myBalance;
    const remainingNeeded = Math.max(0, g.targetAmount - balanceUsed);
    const progressPercent = Math.min(100, (balanceUsed / g.targetAmount) * 100);
    return { ...g, balanceUsed, remainingNeeded, progressPercent };
  });
  const goals = goalsMapped.filter((g) => !g.realizedAt);

  const monthlyData = await getMonthlyData(session.id, partnerId);
  const pieData = Object.values(categoryTotals).map((v) => ({ name: v.name, value: v.income }));

  const comparison = hasPartner ? {
    mySaved: (byUserMonth[session.id]?.income ?? 0) - (byUserMonth[session.id]?.expense ?? 0),
    partnerSaved: (byUserMonth[partnerId!]?.income ?? 0) - (byUserMonth[partnerId!]?.expense ?? 0),
    myExpense: byUserMonth[session.id]?.expense ?? 0,
    partnerExpense: byUserMonth[partnerId!]?.expense ?? 0,
    myIncome: byUserMonth[session.id]?.income ?? 0,
    partnerIncome: byUserMonth[partnerId!]?.income ?? 0,
  } : null;

  return NextResponse.json({
    myBalance,
    partnerBalance,
    totalBalance,
    hasPartner,
    goals,
    monthlyData,
    pieData,
    comparison,
    period: { start, end },
  });
}

async function getMonthlyData(myId: string, partnerId: string | null) {
  const start = new Date();
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const userIds = partnerId ? [myId, partnerId] : [myId];
  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: start } },
    select: { userId: true, type: true, amount: true, createdAt: true },
  });

  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = { income: 0, expense: 0 };
  }

  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = byMonth[key];
    if (!row) continue;
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
