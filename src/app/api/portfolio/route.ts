import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsdUah, lockPurchaseQuote } from "@/lib/cortex/quotes";
import { toInvestmentRecord } from "@/lib/cortex/records";
import { loadPortfolio } from "@/lib/cortex/portfolio";
import type { AssetType } from "@/lib/cortex/types";
import { ASSET_TYPES } from "@/lib/cortex/types";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const snapshot = await loadPortfolio(sessionOr);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;

  const body = (await request.json()) as {
    name?: string;
    type?: string;
    symbol?: string;
    investedAmount?: number;
    investedCurrency?: string;
    quantity?: number;
    purchaseDate?: string;
    monthlyIncome?: number;
    monthlyIncomeCurrency?: string;
    estimatedValue?: number;
    estimatedValueCurrency?: string;
    annualRate?: number;
    notes?: string;
  };

  if (!body.name?.trim() || !body.type || !ASSET_TYPES.includes(body.type as AssetType)) {
    return NextResponse.json({ error: "Потрібні назва і тип активу" }, { status: 400 });
  }
  if (!body.investedAmount || body.investedAmount <= 0 || !body.purchaseDate) {
    return NextResponse.json({ error: "Вкажіть суму вкладення і дату" }, { status: 400 });
  }

  const purchaseDate = new Date(`${body.purchaseDate}T12:00:00.000Z`);
  const investedCurrency = body.investedCurrency === "UAH" ? "UAH" : "USD";

  let purchaseUnitPrice: number | null = null;
  let purchaseUnitCurrency: string | null = null;
  let quantity = body.quantity ?? null;

  try {
    const locked = await lockPurchaseQuote({
      type: body.type,
      symbol: body.symbol,
      purchaseDate,
    });
    if (locked) {
      purchaseUnitPrice = locked.price;
      purchaseUnitCurrency = locked.currency;
      if (!quantity && (body.type === "crypto" || body.type === "stock")) {
        const investedUsd =
          investedCurrency === "USD" ? body.investedAmount : body.investedAmount / (await getUsdUah(purchaseDate));
        if (locked.currency === "USD" && locked.price > 0) quantity = investedUsd / locked.price;
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося зафіксувати курс на дату покупки" },
      { status: 422 },
    );
  }

  const created = await prisma.investment.create({
    data: {
      userId: session.id,
      name: body.name.trim(),
      type: body.type,
      symbol: body.symbol?.trim() || null,
      investedAmount: body.investedAmount,
      investedCurrency,
      quantity,
      purchaseDate,
      purchaseUnitPrice,
      purchaseUnitCurrency,
      monthlyIncome: body.monthlyIncome ?? null,
      monthlyIncomeCurrency: body.monthlyIncome ? body.monthlyIncomeCurrency ?? "UAH" : null,
      estimatedValue: body.estimatedValue ?? null,
      estimatedValueCurrency: body.estimatedValue ? body.estimatedValueCurrency ?? investedCurrency : null,
      annualRate: body.annualRate ?? null,
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json(toInvestmentRecord(created), { status: 201 });
}
