import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere } from "@/lib/data-scope";
import { getExchangeRates } from "@/lib/exchange-rates";
import { transactionInclude } from "@/lib/transaction-include";
import { transactionSchema } from "@/lib/validations";
import { snapshotForTransaction } from "@/lib/asset-transaction";

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
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, type, categoryId, sourceCategoryId, currency, assetSymbol, assetName, assetClass } = parsed.data;
    let amountUah = amount;
    if (currency && currency !== "UAH") {
      const rates = await getExchangeRates();
      if (currency === "USD") amountUah = amount * rates.usd;
      else if (currency === "EUR") amountUah = amount * rates.eur;
    }
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const sameAsset =
      !!assetSymbol &&
      existing.assetSymbol === assetSymbol.toUpperCase() &&
      existing.unitPriceUsd != null &&
      existing.usdRateUah != null;
    const asset = sameAsset
      ? {
          snapshot: {
            assetSymbol: existing.assetSymbol!,
            assetName: existing.assetName ?? assetName ?? existing.assetSymbol!,
            assetClass: (existing.assetClass ?? "stock") as "crypto" | "stock" | "etf",
            unitPriceUsd: existing.unitPriceUsd!,
            usdRateUah: existing.usdRateUah!,
            quantity: amountUah / existing.usdRateUah! / existing.unitPriceUsd!,
          },
        }
      : await snapshotForTransaction({
          type,
          amountUah,
          category: { id: category.id, kind: category.kind, name: category.name },
          sourceCategory: sourceCategory
            ? { id: sourceCategory.id, kind: sourceCategory.kind, name: sourceCategory.name }
            : null,
          assetSymbol,
          assetName,
          assetClass,
          at: existing.createdAt,
        });
    if ("error" in asset && asset.error) return NextResponse.json({ error: asset.error }, { status: 400 });

    const snapshot = asset.snapshot;
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: amountUah,
        type,
        categoryId,
        sourceCategoryId: resolvedSourceCategoryId,
        assetSymbol: snapshot?.assetSymbol ?? null,
        assetName: snapshot?.assetName ?? null,
        assetClass: snapshot?.assetClass ?? null,
        unitPriceUsd: snapshot?.unitPriceUsd ?? null,
        quantity: snapshot?.quantity ?? null,
        usdRateUah: snapshot?.usdRateUah ?? null,
      },
      include: transactionInclude,
    });
    return NextResponse.json(transaction);
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
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
