import { canUseCategory, categoriesVisibleWhere } from "./data-scope";
import { isPrimaryCategory } from "./category-tier";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export async function validateGoalSourceCategoryIds(
  session: SessionUser,
  categoryIds: string[]
): Promise<string[] | null> {
  const uniqueIds = Array.from(new Set(categoryIds));
  const found = await prisma.category.findMany({
    where: { id: { in: uniqueIds }, OR: categoriesVisibleWhere(session).OR },
    select: { id: true, userId: true, createdBy: true, isShared: true, tier: true },
  });
  if (found.length !== uniqueIds.length) return null;
  if (!found.every((c) => canUseCategory(session, c))) return null;
  if (!found.every((c) => isPrimaryCategory(c))) return null;
  return uniqueIds;
}

export async function syncGoalSourceCategories(goalId: string, categoryIds: string[]) {
  await prisma.goalSourceCategory.deleteMany({ where: { goalId } });
  if (categoryIds.length > 0) {
    await prisma.goalSourceCategory.createMany({
      data: categoryIds.map((categoryId) => ({ goalId, categoryId })),
    });
  }
}

export const goalListInclude = {
  createdByUser: { select: { id: true, email: true, role: true } },
  sourceCategories: {
    include: { category: { select: { id: true, name: true, isShared: true } } },
  },
} as const;

type GoalForExpenseCategory = {
  id: string;
  title: string;
  createdBy: string;
  isShared: boolean;
};

export async function getOrCreateGoalExpenseCategory(goal: GoalForExpenseCategory) {
  const existing = await prisma.category.findFirst({
    where: { goalId: goal.id },
  });
  if (existing) {
    if (existing.name !== goal.title) {
      return prisma.category.update({
        where: { id: existing.id },
        data: { name: goal.title },
      });
    }
    return existing;
  }
  return prisma.category.create({
    data: {
      name: goal.title,
      userId: goal.isShared ? null : goal.createdBy,
      createdBy: goal.createdBy,
      isShared: goal.isShared,
      tier: "secondary",
      goalId: goal.id,
    },
  });
}

/** Створює витрату за ціллю (категорія = назва цілі, списання з sourceCategoryId). */
export async function createGoalRealizationExpense(params: {
  goal: GoalForExpenseCategory & { targetAmount: number };
  userId: string;
  sourceCategoryId: string;
}) {
  const { goal, userId, sourceCategoryId } = params;
  const category = await getOrCreateGoalExpenseCategory(goal);
  const existing = await prisma.transaction.findFirst({
    where: { goalId: goal.id, type: "expense" },
    select: { id: true },
  });
  if (existing) return { category, transactionId: existing.id, created: false as const };

  const tx = await prisma.transaction.create({
    data: {
      amount: goal.targetAmount,
      type: "expense",
      categoryId: category.id,
      sourceCategoryId,
      userId,
      goalId: goal.id,
    },
    select: { id: true },
  });
  return { category, transactionId: tx.id, created: true as const };
}

export async function removeGoalExpenseCategory(goalId: string) {
  await prisma.category.deleteMany({ where: { goalId } });
}

/**
 * Відв'язує витратні категорію/транзакції від цілі перед видаленням,
 * щоб історія витрат залишилась у списку транзакцій.
 */
export async function detachGoalExpenseHistory(goalId: string) {
  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { goalId },
      data: { goalId: null },
    }),
    prisma.category.updateMany({
      where: { goalId },
      data: { goalId: null },
    }),
  ]);
}
