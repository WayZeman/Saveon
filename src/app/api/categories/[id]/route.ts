import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesVisibleWhere } from "@/lib/data-scope";
import { categoryPatchSchema } from "@/lib/validations";

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
    const parsed = categoryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const hasPartner = !!session.partnerId;
    const updateData: { name?: string; isShared?: boolean; tier?: string } = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.tier !== undefined) updateData.tier = parsed.data.tier;
    if (parsed.data.isShared !== undefined && !category.isShared) {
      updateData.isShared = hasPartner ? parsed.data.isShared : category.isShared;
    }
    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { transactions: true } } },
    });
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
