type TxForBalance = {
  userId: string;
  type: string;
  amount: number;
  categoryId: string;
  sourceCategoryId: string | null;
  category?: { id: string } | null;
  sourceCategory?: { id: string } | null;
};

type GoalForBalance = {
  isShared: boolean;
  createdBy: string;
  targetAmount: number;
  sourceCategories: { categoryId: string }[];
};

export function buildCategoryNetsByUser(
  transactions: TxForBalance[],
  userIds: string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const uid of userIds) result[uid] = {};

  for (const t of transactions) {
    if (!userIds.includes(t.userId)) continue;
    const nets = result[t.userId];
    if (t.type === "income") {
      const catId = t.category?.id ?? t.categoryId;
      nets[catId] = (nets[catId] ?? 0) + t.amount;
    } else {
      const catId = t.sourceCategory?.id ?? t.sourceCategoryId ?? t.categoryId;
      nets[catId] = (nets[catId] ?? 0) - t.amount;
    }
  }
  return result;
}

export function computeGoalBalanceUsed(
  goal: GoalForBalance,
  categoryNetsByUser: Record<string, Record<string, number>>,
  sessionId: string,
  partnerId: string | null,
  fallback: { myBalance: number; totalBalance: number }
): number {
  const categoryIds = goal.sourceCategories.map((s) => s.categoryId);
  if (categoryIds.length === 0) {
    return goal.isShared ? fallback.totalBalance : fallback.myBalance;
  }

  const userIds =
    goal.isShared && partnerId ? [sessionId, partnerId] : [goal.createdBy];

  let sum = 0;
  for (const uid of userIds) {
    const nets = categoryNetsByUser[uid] ?? {};
    for (const catId of categoryIds) {
      sum += nets[catId] ?? 0;
    }
  }
  return sum;
}

export function computeGoalProgress(
  goal: GoalForBalance,
  categoryNetsByUser: Record<string, Record<string, number>>,
  sessionId: string,
  partnerId: string | null,
  fallback: { myBalance: number; totalBalance: number }
) {
  const balanceUsed = computeGoalBalanceUsed(goal, categoryNetsByUser, sessionId, partnerId, fallback);
  const remainingNeeded = Math.max(0, goal.targetAmount - balanceUsed);
  const progressPercent = goal.targetAmount > 0 ? Math.min(100, (balanceUsed / goal.targetAmount) * 100) : 0;
  return { balanceUsed, remainingNeeded, progressPercent };
}

export const goalSourceCategoriesInclude = {
  sourceCategories: {
    include: { category: { select: { id: true, name: true, isShared: true } } },
  },
} as const;

export function mapGoalSourceCategories<
  T extends { sourceCategories: { categoryId: string; category: { id: string; name: string; isShared: boolean } }[] },
>(goal: T) {
  return {
    ...goal,
    sourceCategories: goal.sourceCategories.map((s) => s.category),
  };
}

