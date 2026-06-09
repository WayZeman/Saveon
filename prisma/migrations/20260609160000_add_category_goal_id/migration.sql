-- AlterTable
ALTER TABLE "Category" ADD COLUMN "goalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_goalId_key" ON "Category"("goalId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
