import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesVisibleWhere } from "@/lib/data-scope";
import { transactionSchema } from "@/lib/validations";
import { getMarketQuote } from "@/lib/market-quote";

function isSchemaMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("P2022") || message.includes("does not exist");
}

async function getRates(): Promise<{ usd: number; eur: number }> {
  try {
    const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("NBU fetch failed");
    const data = (await res.json()) as { cc: string; rate: number }[];
    const usd = data.find((x) => x.cc === "USD")?.rate ?? 41;
    const eur = data.find((x) => x.cc === "EUR")?.rate ?? 45;
    return { usd, eur };
  } catch {
    return { usd: 41, eur: 45 };
  }
}

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const month = searchParams.get("month"); // YYYY-MM
  const type = searchParams.get("type") as "income" | "expense" | null;

  const where: Record<string, unknown> = { userId: session.id };
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true, isShared: true, marketSymbol: true } } },
    });
    return NextResponse.json(transactions);
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        type: true,
        categoryId: true,
        createdAt: true,
        category: { select: { id: true, name: true, isShared: true } },
      },
    });
    return NextResponse.json(
      transactions.map((t) => ({
        ...t,
        originalAmount: t.amount,
        originalCurrency: "UAH",
        exchangeRateToUah: 1,
        assetSymbol: null,
        assetPrice: null,
        assetCurrency: null,
        category: { ...t.category, marketSymbol: null },
      }))
    );
  }
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
    const { amount, type, categoryId, goalId, currency } = parsed.data;
    const rates = await getRates();
    let amountUah = amount;
    if (currency && currency !== "UAH") {
      if (currency === "USD") amountUah = amount * rates.usd;
      else if (currency === "EUR") amountUah = amount * rates.eur;
    }
    const category = await prisma.category.findFirst({
      where: { id: categoryId, OR: categoriesVisibleWhere(session).OR },
      select: { id: true, userId: true, createdBy: true, isShared: true, marketSymbol: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const partnerId = session.partnerId;
    const isLegacyGlobal = category.isShared && category.userId === null && category.createdBy === null;
    const canUse =
      category.userId === session.id ||
      category.createdBy === session.id ||
      (!!partnerId && category.isShared && category.createdBy === partnerId) ||
      isLegacyGlobal;
    if (!canUse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let assetSymbol: string | null = null;
    let assetPrice: number | null = null;
    let assetCurrency: string | null = null;
    if (category.marketSymbol) {
      const quote = await getMarketQuote(category.marketSymbol);
      if (quote) {
        assetSymbol = quote.symbol;
        assetPrice = quote.price;
        assetCurrency = quote.currency;
      }
    }

    try {
      const transaction = await prisma.transaction.create({
        data: {
          amount: amountUah,
          originalAmount: amount,
          originalCurrency: currency ?? "UAH",
          exchangeRateToUah: currency === "USD" ? (amountUah / amount) : currency === "EUR" ? (amountUah / amount) : 1,
          assetSymbol,
          assetPrice,
          assetCurrency,
          type,
          categoryId,
          userId: session.id,
          goalId: goalId ?? null,
        },
        include: { category: { select: { id: true, name: true, isShared: true, marketSymbol: true } } },
      });
      return NextResponse.json(transaction);
    } catch (e) {
      if (!isSchemaMismatchError(e)) throw e;
      const transaction = await prisma.transaction.create({
        data: {
          amount: amountUah,
          type,
          categoryId,
          userId: session.id,
          goalId: goalId ?? null,
        },
        include: { category: { select: { id: true, name: true, isShared: true } } },
      });
      return NextResponse.json({
        ...transaction,
        originalAmount: transaction.amount,
        originalCurrency: "UAH",
        exchangeRateToUah: 1,
        assetSymbol: null,
        assetPrice: null,
        assetCurrency: null,
        category: { ...transaction.category, marketSymbol: null },
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
