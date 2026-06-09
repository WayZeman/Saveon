import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere, goalsVisibleWhere } from "@/lib/data-scope";
import { isPrimaryCategory } from "@/lib/category-tier";
import { goalListInclude, syncGoalSourceCategories, validateGoalSourceCategoryIds } from "@/lib/goal-api";
import { mapGoalSourceCategories } from "@/lib/goal-balance";
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
    include: goalListInclude,
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mapGoalSourceCategories(goal));
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
    include: { sourceCategories: { select: { categoryId: true } } },
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
      if (parsed.data.realize) {
        if (goal.realizedAt) {
          const current = await prisma.goal.findUnique({
            where: { id: goalId },
            include: goalListInclude,
          });
          return NextResponse.json(mapGoalSourceCategories(current!));
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
        if (!isPrimaryCategory(sourceCategory)) {
          return NextResponse.json({ error: "Only primary categories can fund goals" }, { status: 400 });
        }
        const allowedIds = goal.sourceCategories.map((s) => s.categoryId);
        if (allowedIds.length > 0 && !allowedIds.includes(sourceCategory.id)) {
          return NextResponse.json({ error: "Category not allowed for this goal" }, { status: 400 });
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
          include: goalListInclude,
        });
        return NextResponse.json(mapGoalSourceCategories(updated));
      }

      await prisma.transaction.deleteMany({
        where: { goalId: goal.id },
      });
      const updated = await prisma.goal.update({
        where: { id: goalId },
        data: { realizedAt: null },
        include: goalListInclude,
      });
      return NextResponse.json(mapGoalSourceCategories(updated));
    }
    const hasPartner = !!session.partnerId;
    const updateData: { title?: string; targetAmount?: number; isShared?: boolean } = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
    if (parsed.data.targetAmount !== undefined) updateData.targetAmount = parsed.data.targetAmount;
    if (parsed.data.isShared !== undefined) updateData.isShared = hasPartner ? parsed.data.isShared : false;

    let resolvedSourceIds: string[] | null = null;
    if (parsed.data.sourceCategoryIds !== undefined) {
      resolvedSourceIds = await validateGoalSourceCategoryIds(session, parsed.data.sourceCategoryIds);
      if (!resolvedSourceIds) {
        return NextResponse.json({ error: "Invalid source categories" }, { status: 400 });
      }
    }

    if (Object.keys(updateData).length === 0 && resolvedSourceIds === null) {
      const current = await prisma.goal.findUnique({
        where: { id: goalId },
        include: goalListInclude,
      });
      return NextResponse.json(mapGoalSourceCategories(current!));
    }
    if (goal.createdBy !== session.id && !goal.isShared) {
      return NextResponse.json({ error: "Can only edit title/amount of your own goals" }, { status: 403 });
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.goal.update({
        where: { id: goalId },
        data: updateData,
      });
    }
    if (resolvedSourceIds !== null) {
      await syncGoalSourceCategories(goalId, resolvedSourceIds);
    }
    const updated = await prisma.goal.findUnique({
      where: { id: goalId },
      include: goalListInclude,
    });
    return NextResponse.json(mapGoalSourceCategories(updated!));
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
