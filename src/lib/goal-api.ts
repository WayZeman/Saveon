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
