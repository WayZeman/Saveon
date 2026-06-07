import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere } from "@/lib/data-scope";
import { getExchangeRates } from "@/lib/exchange-rates";
import { transactionInclude } from "@/lib/transaction-include";
import { transactionSchema } from "@/lib/validations";

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
    const { amount, type, categoryId, sourceCategoryId, currency } = parsed.data;
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

    let resolvedSourceCategoryId: string | null = null;
    if (type === "expense") {
      const sourceCategory = await prisma.category.findFirst({
        where: { id: sourceCategoryId!, OR: categoriesVisibleWhere(session).OR },
      });
      if (!sourceCategory) return NextResponse.json({ error: "Source category not found" }, { status: 404 });
      if (!canUseCategory(session, sourceCategory)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      resolvedSourceCategoryId = sourceCategory.id;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { amount: amountUah, type, categoryId, sourceCategoryId: resolvedSourceCategoryId },
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
