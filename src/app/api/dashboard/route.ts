import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalsVisibleWhere } from "@/lib/data-scope";
import { goalListInclude } from "@/lib/goal-api";
import {
  buildCategoryNetsByUser,
  computeGoalProgress,
  computeHomeGoalsSummary,
  mapGoalSourceCategories,
} from "@/lib/goal-balance";
import { syncHoldingsForUsers } from "@/lib/asset-sync";
import { getCurrentPricesUsd, getUsdUahRate } from "@/lib/asset-prices";
import { computeHoldings } from "@/lib/holdings";
type Agg = { userId: string; income: number; expense: number };

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
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

  await syncHoldingsForUsers(userIds);

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      type: true,
      amount: true,
      categoryId: true,
      sourceCategoryId: true,
      createdAt: true,
      assetSymbol: true,
      assetName: true,
      assetClass: true,
      unitPriceUsd: true,
      quantity: true,
      usdRateUah: true,
      category: { select: { id: true, name: true } },
      sourceCategory: { select: { id: true, name: true } },
    },
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

  // Нетто по категоріях-джерелах: дохід зараховується в categoryId, витрата знімається з sourceCategoryId.
  const categoryTotals: Record<string, { name: string; net: number }> = {};
  for (const t of allTransactions) {
    if (t.type === "income") {
      const catId = t.category?.id ?? t.categoryId;
      const catName = t.category?.name ?? "Інше";
      if (!categoryTotals[catId]) categoryTotals[catId] = { name: catName, net: 0 };
      categoryTotals[catId].net += t.amount;
    } else {
      const catId = t.sourceCategory?.id ?? t.sourceCategoryId ?? t.categoryId;
      const catName = t.sourceCategory?.name ?? t.category?.name ?? "Інше";
      if (!categoryTotals[catId]) categoryTotals[catId] = { name: catName, net: 0 };
      categoryTotals[catId].net -= t.amount;
    }
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
    where: goalsVisibleWhere(session),
    orderBy: { createdAt: "desc" },
    include: goalListInclude,
  });

  const categoryNetsByUser = buildCategoryNetsByUser(allTransactions, userIds);
  const fallback = { myBalance, totalBalance };

  const goalsMapped = goalsRaw.map((g) => {
    const mapped = mapGoalSourceCategories(g);
    const progress = computeGoalProgress(g, categoryNetsByUser, session.id, partnerId, fallback);
    return { ...mapped, ...progress };
  });
  const goals = goalsMapped.filter((g) => !g.realizedAt);
  const goalsSummary = computeHomeGoalsSummary(
    goals,
    categoryNetsByUser,
    session.id,
    partnerId,
    totalBalance
  );

  const monthlyData = await getMonthlyData(session.id, partnerId);
  const categoryBreakdown = Object.entries(categoryTotals)
    .filter(([, v]) => Math.abs(v.net) >= 0.005)
    .sort((a, b) => b[1].net - a[1].net)
    .map(([id, v]) => ({ id, name: v.name, net: Math.round(v.net * 100) / 100 }));
  const categoryBreakdownTotal = Math.round(categoryBreakdown.reduce((s, c) => s + c.net, 0) * 100) / 100;
  // Діаграма — лише позитивні вкладення; повний список і «Разом» збігаються з балансом.
  const pieData = categoryBreakdown
    .filter((v) => v.net > 0)
    .map((v) => ({ name: v.name, value: v.net, chartValue: v.net }));

  const pricedAssets = allTransactions
    .filter((t) => t.assetSymbol)
    .map((t) => ({ symbol: t.assetSymbol as string, assetClass: t.assetClass }));
  const [currentPrices, usdUah] = await Promise.all([
    getCurrentPricesUsd(pricedAssets),
    getUsdUahRate(),
  ]);
  const holdings = computeHoldings(
    allTransactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId,
      sourceCategoryId: t.sourceCategoryId,
      categoryName: t.category?.name ?? "Інше",
      sourceCategoryName: t.sourceCategory?.name ?? null,
      assetSymbol: t.assetSymbol,
      assetName: t.assetName,
      assetClass: t.assetClass,
      unitPriceUsd: t.unitPriceUsd,
      quantity: t.quantity,
      usdRateUah: t.usdRateUah,
      createdAt: t.createdAt,
    })),
    currentPrices,
    usdUah
  );

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
    goalsSummary,
    monthlyData,
    pieData,
    categoryBreakdown,
    categoryBreakdownTotal,
    holdings,
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
