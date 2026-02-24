import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";

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
    const { amount, type, categoryId, goalId } = parsed.data;
    const category = await prisma.category.findFirst({
      where: { id: categoryId },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const canUse = category.userId === null || category.userId === session.id;
    if (!canUse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const transaction = await prisma.transaction.create({
      data: {
        amount,
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
