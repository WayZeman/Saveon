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
  // Розподіл по категоріях за весь час (всі транзакції)
  const categoryTotals: Record<string, { name: string; income: number }> = {};
  for (const t of allTransactions) {
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
  const userIds = partnerId ? [myId, partnerId] : [myId];
  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds } },
    select: { type: true, amount: true, createdAt: true },
  });

  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
    if (t.type === "income") byMonth[key].income += t.amount;
    else byMonth[key].expense += t.amount;
  }

  const keys = Object.keys(byMonth).sort();
  if (keys.length === 0) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return [{ month: key, income: 0, expense: 0 }];
  }
  const [firstY, firstM] = keys[0].split("-").map(Number);
  const [lastY, lastM] = keys[keys.length - 1].split("-").map(Number);
  const start = new Date(firstY, firstM - 1, 1);
  const end = new Date(lastY, lastM - 1, 1);
  const result: { month: string; income: number; expense: number }[] = [];
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, ...(byMonth[key] ?? { income: 0, expense: 0 }) });
  }
  return result;
}
