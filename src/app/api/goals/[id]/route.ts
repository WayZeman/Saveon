import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema, goalPatchSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const goal = await prisma.goal.findFirst({
    where: {
      id,
      OR: [{ createdBy: session.id }, { isShared: true }],
    },
    include: {
      createdByUser: { select: { id: true, email: true, role: true } },
    },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id: goalId } = await params;
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      OR: [{ createdBy: session.id }, { isShared: true }],
    },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canEdit = goal.createdBy === session.id || goal.isShared;
  if (!canEdit) {
    return NextResponse.json({ error: "Can only edit your own or shared goals" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = goalPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.realize !== undefined) {
      if (parsed.data.realize) {
        let category = await prisma.category.findFirst({
          where: { name: "Цілі", isShared: true },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: "Цілі", userId: null, isShared: true },
          });
        }
        await prisma.transaction.create({
          data: {
            amount: goal.targetAmount,
            type: "expense",
            categoryId: category.id,
            userId: session.id,
            goalId: goal.id,
          },
        });
      } else {
        await prisma.transaction.deleteMany({
          where: { goalId: goal.id },
        });
      }
      const updated = await prisma.goal.update({
        where: { id: goalId },
        data: { realizedAt: parsed.data.realize ? new Date() : null },
        include: {
          createdByUser: { select: { id: true, email: true, role: true } },
        },
      });
      return NextResponse.json(updated);
    }
    const hasPartner = !!session.partnerId;
    const updateData: { title?: string; targetAmount?: number; isShared?: boolean } = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
    if (parsed.data.targetAmount !== undefined) updateData.targetAmount = parsed.data.targetAmount;
    if (parsed.data.isShared !== undefined) updateData.isShared = hasPartner ? parsed.data.isShared : false;
    if (Object.keys(updateData).length === 0) {
      const current = await prisma.goal.findUnique({
        where: { id: goalId },
        include: { createdByUser: { select: { id: true, email: true, role: true } } },
      });
      return NextResponse.json(current);
    }
    if (goal.createdBy !== session.id && !goal.isShared) {
      return NextResponse.json({ error: "Can only edit title/amount of your own goals" }, { status: 403 });
    }
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        createdByUser: { select: { id: true, email: true, role: true } },
      },
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
  const goal = await prisma.goal.findFirst({
    where: {
      id,
      OR: [{ createdBy: session.id }, { isShared: true }],
    },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (goal.createdBy !== session.id && !goal.isShared) {
    return NextResponse.json({ error: "Can only delete your own goals" }, { status: 403 });
  }
  try {
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
