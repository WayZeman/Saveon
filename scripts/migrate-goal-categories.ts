/**
 * Переносить старі транзакції зі службової категорії «Цілі»
 * на окремі категорії з назвою кожної цілі.
 *
 * Запуск: npm run migrate:goal-categories
 */
import { prisma } from "../src/lib/prisma";
import { getOrCreateGoalExpenseCategory } from "../src/lib/goal-api";

async function findGoalsBucketCategories() {
  const candidates = await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { isShared: true, userId: null },
      ],
    },
  });
  return candidates.filter((c) => c.name === "Цілі");
}

async function main() {
  const buckets = await findGoalsBucketCategories();
  if (buckets.length === 0) {
    console.log("migrate-goal-categories: категорій «Цілі» не знайдено");
    return;
  }

  const bucketIds = buckets.map((b) => b.id);
  const transactions = await prisma.transaction.findMany({
    where: {
      categoryId: { in: bucketIds },
      goalId: { not: null },
    },
    select: { id: true, goalId: true },
  });

  if (transactions.length === 0) {
    console.log("migrate-goal-categories: транзакцій для переносу немає");
  }

  const goalIds = Array.from(
    new Set(transactions.map((t) => t.goalId).filter((id): id is string => !!id))
  );

  let updated = 0;
  for (const goalId of goalIds) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) continue;

    const expenseCategory = await getOrCreateGoalExpenseCategory(goal);
    const result = await prisma.transaction.updateMany({
      where: { goalId: goal.id, categoryId: { in: bucketIds } },
      data: { categoryId: expenseCategory.id },
    });
    updated += result.count;
    console.log(`  ✓ ${goal.title}: ${result.count} транзакцій → «${goal.title}»`);
  }

  for (const bucket of buckets) {
    const remaining = await prisma.transaction.count({ where: { categoryId: bucket.id } });
    if (remaining === 0) {
      await prisma.category.delete({ where: { id: bucket.id } });
      console.log(`  ✓ видалено порожню категорію «Цілі» (${bucket.id})`);
    } else {
      console.log(`  ⚠ категорія «Цілі» (${bucket.id}) лишилась з ${remaining} транзакціями без goalId`);
    }
  }

  console.log(`migrate-goal-categories: OK, оновлено ${updated} транзакцій для ${goalIds.length} цілей`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
