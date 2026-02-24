import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const category = await prisma.category.findFirst({
    where: { id },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canEdit = category.isShared || category.userId === session.id;
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
    const updateData = category.isShared
      ? { name: parsed.data.name.trim() }
      : { name: parsed.data.name.trim(), isShared: effectiveShared };
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
  const session = await requireSession();
  const { id } = await params;
  const category = await prisma.category.findFirst({
    where: { id },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canDelete = category.isShared || category.userId === session.id;
  if (!canDelete) {
    return NextResponse.json({ error: "Can only delete your own or shared categories" }, { status: 403 });
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
