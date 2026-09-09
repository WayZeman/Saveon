import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { investmentsVisibleWhere } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const { id } = await params;
  const existing = await prisma.investment.findFirst({
    where: { id, ...investmentsVisibleWhere(sessionOr) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Немає такої інвестиції" }, { status: 404 });
  await prisma.investment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
