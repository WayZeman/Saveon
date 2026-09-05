import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCategory, categoriesVisibleWhere, goalsVisibleWhere } from "@/lib/data-scope";
import { isPrimaryCategory } from "@/lib/category-tier";
import {
  goalListInclude,
  syncGoalSourceCategories,
  validateGoalSourceCategoryIds,
  createGoalRealizationExpense,
  detachGoalExpenseHistory,
} from "@/lib/goal-api";
import { parseGoalDeadline } from "@/lib/goal-dates";
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

        // Idempotent: вже реалізована ціль — лише достворити витрату, якщо її немає
        await createGoalRealizationExpense({
          goal,
          userId: session.id,
          sourceCategoryId: sourceCategory.id,
        });

        const updated = await prisma.goal.update({
          where: { id: goalId },
          data: { realizedAt: goal.realizedAt ?? new Date() },
          include: goalListInclude,
        });
        return NextResponse.json(mapGoalSourceCategories(updated));
      }

      // Скасування реалізації — прибираємо створену витрату й службову категорію цілі
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { goalId: goal.id } }),
        prisma.category.deleteMany({ where: { goalId: goal.id } }),
        prisma.goal.update({
          where: { id: goalId },
          data: { realizedAt: null },
        }),
      ]);
      const updated = await prisma.goal.findUnique({
        where: { id: goalId },
        include: goalListInclude,
      });
      return NextResponse.json(mapGoalSourceCategories(updated!));
    }
    const hasPartner = !!session.partnerId;
    const updateData: {
      title?: string;
      targetAmount?: number;
      isShared?: boolean;
      description?: string | null;
      deadline?: Date | null;
    } = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
    if (parsed.data.targetAmount !== undefined) updateData.targetAmount = parsed.data.targetAmount;
    if (parsed.data.isShared !== undefined) updateData.isShared = hasPartner ? parsed.data.isShared : false;
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description?.trim() || null;
    }
    if (parsed.data.deadline !== undefined) {
      updateData.deadline = parsed.data.deadline ? parseGoalDeadline(parsed.data.deadline) : null;
    }

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
    // Зберігаємо витрату в історії транзакцій навіть після видалення цілі
    await detachGoalExpenseHistory(id);
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
