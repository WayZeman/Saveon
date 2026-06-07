import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere, goalsVisibleWhere } from "@/lib/data-scope";
import { goalPatchSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;
  const goal = await prisma.goal.findFirst({
    where: {
      id,
      ...goalsVisibleWhere(session),
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
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id: goalId } = await params;
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      ...goalsVisibleWhere(session),
    },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const partnerId = session.partnerId;
  const canEdit =
    goal.createdBy === session.id ||
    (!!partnerId && goal.isShared && goal.createdBy === partnerId);
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
      const goalInclude = {
        createdByUser: { select: { id: true, email: true, role: true } },
      } as const;

      if (parsed.data.realize) {
        if (goal.realizedAt) {
          const current = await prisma.goal.findUnique({
            where: { id: goalId },
            include: goalInclude,
          });
          return NextResponse.json(current);
        }

        const sourceCategory = await prisma.category.findFirst({
          where: { id: parsed.data.sourceCategoryId!, OR: categoriesVisibleWhere(session).OR },
        });
        if (!sourceCategory) {
          return NextResponse.json({ error: "Source category not found" }, { status: 404 });
        }
        if (!canUseCategory(session, sourceCategory)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let category = await prisma.category.findFirst({
          where: {
            OR: [
              { name: "Цілі", isShared: true, isSystem: true },
              { name: "Цілі", isShared: true, userId: null, createdBy: null },
            ],
          },
        });
        if (!category) {
          category = await prisma.category.create({
            data: {
              name: "Цілі",
              userId: null,
              isShared: true,
              isSystem: true,
              createdBy: session.id,
            },
          });
        }

        await prisma.transaction.create({
          data: {
            amount: goal.targetAmount,
            type: "expense",
            categoryId: category.id,
            sourceCategoryId: sourceCategory.id,
            userId: session.id,
            goalId: goal.id,
          },
        });

        const updated = await prisma.goal.update({
          where: { id: goalId },
          data: { realizedAt: new Date() },
          include: goalInclude,
        });
        return NextResponse.json(updated);
      }

      await prisma.transaction.deleteMany({
        where: { goalId: goal.id },
      });
      const updated = await prisma.goal.update({
        where: { id: goalId },
        data: { realizedAt: null },
        include: goalInclude,
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
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;
  const goal = await prisma.goal.findFirst({
    where: {
      id,
      ...goalsVisibleWhere(session),
    },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const partnerId = session.partnerId;
  const canDelete =
    goal.createdBy === session.id ||
    (!!partnerId && goal.isShared && goal.createdBy === partnerId);
  if (!canDelete) {
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
