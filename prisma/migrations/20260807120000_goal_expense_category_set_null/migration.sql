-- Preserve per-goal expense categories (and their transactions) when a goal is deleted.
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_goalId_fkey";

ALTER TABLE "Category" ADD CONSTRAINT "Category_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
