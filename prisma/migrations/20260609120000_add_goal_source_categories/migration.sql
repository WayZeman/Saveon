-- CreateTable
CREATE TABLE "GoalSourceCategory" (
    "goalId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "GoalSourceCategory_pkey" PRIMARY KEY ("goalId","categoryId")
);

-- AddForeignKey
ALTER TABLE "GoalSourceCategory" ADD CONSTRAINT "GoalSourceCategory_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSourceCategory" ADD CONSTRAINT "GoalSourceCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
