import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, type, categoryId } = parsed.data;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const category = await prisma.category.findFirst({
      where: { id: categoryId },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const canUse = category.userId === null || category.userId === session.id;
    if (!canUse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { amount, type, categoryId },
      include: { category: { select: { id: true, name: true, isShared: true } } },
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
  const session = await requireSession();
  const { id } = await params;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
