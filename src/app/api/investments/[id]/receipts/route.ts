import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { investmentsVisibleWhere } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const { id } = await params;
  const body = (await request.json()) as {
    amount?: number;
    currency?: string;
    receivedAt?: string;
    notes?: string;
  };

  if (!body.amount || body.amount <= 0 || !body.receivedAt) {
    return NextResponse.json({ error: "Вкажіть суму і дату надходження" }, { status: 400 });
  }

  const investment = await prisma.investment.findFirst({
    where: { id, ...investmentsVisibleWhere(sessionOr) },
    select: { id: true },
  });
  if (!investment) return NextResponse.json({ error: "Немає такої інвестиції" }, { status: 404 });

  const created = await prisma.incomeReceipt.create({
    data: {
      investmentId: id,
      amount: body.amount,
      currency: body.currency === "UAH" ? "UAH" : "USD",
      receivedAt: new Date(`${body.receivedAt}T12:00:00.000Z`),
      notes: body.notes?.trim() || "Оренда",
    },
  });

  return NextResponse.json(created, { status: 201 });
}
