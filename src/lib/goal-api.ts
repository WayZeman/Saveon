import { canUseCategory, categoriesVisibleWhere } from "./data-scope";

export function parseGoalDeadline(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

export function formatGoalDeadlineInput(deadline: Date | string | null | undefined): string {
  if (!deadline) return "";
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
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

export async function removeGoalExpenseCategory(goalId: string) {
  await prisma.category.deleteMany({ where: { goalId } });
}
