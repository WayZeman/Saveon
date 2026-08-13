import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere, transactionUserIds } from "@/lib/data-scope";
import { getExchangeRates } from "@/lib/exchange-rates";
import { transactionInclude } from "@/lib/transaction-include";
import { transactionSchema } from "@/lib/validations";
import { snapshotForTransaction } from "@/lib/asset-transaction";

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const month = searchParams.get("month"); // YYYY-MM
  const type = searchParams.get("type") as "income" | "expense" | null;

  const where: Record<string, unknown> = { userId: { in: transactionUserIds(session) } };
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: transactionInclude,
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, type, categoryId, sourceCategoryId, goalId, currency, assetSymbol, assetName, assetClass } = parsed.data;
    let amountUah = amount;
    if (currency && currency !== "UAH") {
      const rates = await getExchangeRates();
      if (currency === "USD") amountUah = amount * rates.usd;
      else if (currency === "EUR") amountUah = amount * rates.eur;
    }
    const category = await prisma.category.findFirst({
      where: { id: categoryId, OR: categoriesVisibleWhere(session).OR },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (!canUseCategory(session, category)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let sourceCategory = null;
    let resolvedSourceCategoryId: string | null = null;
    if (type === "expense") {
      sourceCategory = await prisma.category.findFirst({
        where: { id: sourceCategoryId!, OR: categoriesVisibleWhere(session).OR },
      });
      if (!sourceCategory) return NextResponse.json({ error: "Source category not found" }, { status: 404 });
      if (!canUseCategory(session, sourceCategory)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      resolvedSourceCategoryId = sourceCategory.id;
    }

    const asset = await snapshotForTransaction({
      type,
      amountUah,
      category: { id: category.id, kind: category.kind, name: category.name },
      sourceCategory: sourceCategory
        ? { id: sourceCategory.id, kind: sourceCategory.kind, name: sourceCategory.name }
        : null,
      assetSymbol,
      assetName,
      assetClass,
    });
    if (asset.error) return NextResponse.json({ error: asset.error }, { status: 400 });

    const transaction = await prisma.transaction.create({
      data: {
        amount: amountUah,
        type,
        categoryId,
        sourceCategoryId: resolvedSourceCategoryId,
        userId: session.id,
        goalId: goalId ?? null,
        assetSymbol: asset.snapshot?.assetSymbol ?? null,
        assetName: asset.snapshot?.assetName ?? null,
        assetClass: asset.snapshot?.assetClass ?? null,
        unitPriceUsd: asset.snapshot?.unitPriceUsd ?? null,
        quantity: asset.snapshot?.quantity ?? null,
        usdRateUah: asset.snapshot?.usdRateUah ?? null,
      },
      include: transactionInclude,
    });
    return NextResponse.json(transaction);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
