import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesVisibleWhere } from "@/lib/data-scope";
import { categorySchema } from "@/lib/validations";

function isSchemaMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("P2022") || message.includes("does not exist");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;
  const category = await prisma.category.findFirst({
    where: { id, OR: categoriesVisibleWhere(session).OR },
    select: { id: true, name: true, userId: true, createdBy: true, isShared: true, isSystem: true },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isProtectedTemplate =
    category.isSystem ||
    (category.isShared && category.userId === null && category.createdBy === null);
  if (isProtectedTemplate) {
    return NextResponse.json({ error: "Цю категорію неможливо змінити" }, { status: 403 });
  }
  const partnerId = session.partnerId;
  const canEdit =
    category.userId === session.id ||
    category.createdBy === session.id ||
    (!!partnerId && category.isShared && category.createdBy === partnerId);
  if (!canEdit) {
    return NextResponse.json({ error: "Can only edit your own or shared categories" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? parsed.data.isShared : category.isShared;
    const normalizedMarketSymbol = parsed.data.marketSymbol ? parsed.data.marketSymbol.trim().toUpperCase() : null;
    const updateData = category.isShared
      ? { name: parsed.data.name.trim(), marketSymbol: normalizedMarketSymbol }
      : { name: parsed.data.name.trim(), isShared: effectiveShared, marketSymbol: normalizedMarketSymbol };
    let updated;
    try {
      updated = await prisma.category.update({
        where: { id },
        data: updateData,
        include: { _count: { select: { transactions: true } } },
      });
    } catch (e) {
      if (!isSchemaMismatchError(e)) throw e;
      updated = await prisma.category.update({
        where: { id },
        data: category.isShared
          ? { name: parsed.data.name.trim() }
          : { name: parsed.data.name.trim(), isShared: effectiveShared },
        include: { _count: { select: { transactions: true } } },
      });
      return NextResponse.json({ ...updated, marketSymbol: null });
    }
    return NextResponse.json(updated);
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
  const category = await prisma.category.findFirst({
    where: { id, OR: categoriesVisibleWhere(session).OR },
    select: { id: true, userId: true, createdBy: true, isShared: true, isSystem: true },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isProtectedTemplate =
    category.isSystem ||
    (category.isShared && category.userId === null && category.createdBy === null);
  if (isProtectedTemplate) {
    return NextResponse.json({ error: "Цю категорію неможливо видалити" }, { status: 403 });
  }
  const partnerId = session.partnerId;
  const canDelete =
    category.userId === session.id ||
    category.createdBy === session.id ||
    (!!partnerId && category.isShared && category.createdBy === partnerId);
  if (!canDelete) {
    return NextResponse.json({ error: "Can only delete your own or shared categories" }, { status: 403 });
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
