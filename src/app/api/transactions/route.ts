import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";

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
  const session = await requireSession();
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

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: { select: { id: true, name: true, isShared: true } } },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const session = await requireSession();
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, type, categoryId, goalId, currency } = parsed.data;
    let amountUah = amount;
    if (currency && currency !== "UAH") {
      const rates = await getRates();
      if (currency === "USD") amountUah = amount * rates.usd;
      else if (currency === "EUR") amountUah = amount * rates.eur;
    }
    const category = await prisma.category.findFirst({
      where: { id: categoryId },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const canUse = category.userId === null || category.userId === session.id;
    if (!canUse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json(transaction);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
