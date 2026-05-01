import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesVisibleWhere } from "@/lib/data-scope";
import { transactionPatchSchema } from "@/lib/validations";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = transactionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, type, categoryId } = parsed.data;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.id },
      select: { id: true, originalCurrency: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const currency = parsed.data.currency ?? (existing.originalCurrency as "UAH" | "USD" | "EUR" | undefined) ?? "UAH";
    let amountUah = amount;
    let exchangeRateToUah = 1;
    if (currency !== "UAH") {
      const rates = await getRates();
      if (currency === "USD") exchangeRateToUah = rates.usd;
      else exchangeRateToUah = rates.eur;
      amountUah = amount * exchangeRateToUah;
    }
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
      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          amount: amountUah,
          originalAmount: amount,
          originalCurrency: currency,
          exchangeRateToUah,
          assetSymbol,
          assetPrice,
          assetCurrency,
          type,
          categoryId,
        },
        include: { category: { select: { id: true, name: true, isShared: true, marketSymbol: true } } },
      });
      return NextResponse.json(transaction);
    } catch (e) {
      if (!isSchemaMismatchError(e)) throw e;
      const transaction = await prisma.transaction.update({
        where: { id },
        data: { amount: amountUah, type, categoryId },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
