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

type HomeGoalSummaryInput = GoalForBalance & { createdBy: string };

/** Зведення для головної: без подвійного підрахунку категорій між цілями, з обмеженням балансом. */
export function computeHomeGoalsSummary(
  goals: HomeGoalSummaryInput[],
  categoryNetsByUser: Record<string, Record<string, number>>,
  sessionId: string,
  partnerId: string | null,
  balanceCap: number
) {
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  if (goals.length === 0 || totalTarget <= 0) {
    return { totalTarget: 0, totalCollected: 0, totalRemaining: 0, fillPercent: 0 };
  }

  const hasOpenGoal = goals.some((g) => g.sourceCategories.length === 0);
  let poolCollected = 0;

  if (hasOpenGoal) {
    poolCollected = balanceCap;
  } else {
    const counted = new Set<string>();
    for (const goal of goals) {
      const userIds =
        goal.isShared && partnerId ? [sessionId, partnerId] : [goal.createdBy];
      for (const uid of userIds) {
        const nets = categoryNetsByUser[uid] ?? {};
        for (const { categoryId } of goal.sourceCategories) {
          const key = `${uid}:${categoryId}`;
          if (counted.has(key)) continue;
          counted.add(key);
          poolCollected += nets[categoryId] ?? 0;
        }
      }
    }
  }

  const totalCollected = Math.min(balanceCap, Math.max(0, poolCollected), totalTarget);
  const totalRemaining = Math.max(0, totalTarget - totalCollected);
  const fillPercent = Math.min(100, (totalCollected / totalTarget) * 100);

  return { totalTarget, totalCollected, totalRemaining, fillPercent };
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

