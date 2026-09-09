-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "symbol" TEXT,
    "investedAmount" DOUBLE PRECISION NOT NULL,
    "investedCurrency" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseUnitPrice" DOUBLE PRECISION,
    "purchaseUnitCurrency" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "monthlyIncomeCurrency" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "estimatedValueCurrency" TEXT,
    "annualRate" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeReceipt" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "Investment_type_idx" ON "Investment"("type");

-- CreateIndex
CREATE INDEX "Investment_purchaseDate_idx" ON "Investment"("purchaseDate");

-- CreateIndex
CREATE INDEX "IncomeReceipt_investmentId_idx" ON "IncomeReceipt"("investmentId");

-- CreateIndex
CREATE INDEX "IncomeReceipt_receivedAt_idx" ON "IncomeReceipt"("receivedAt");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeReceipt" ADD CONSTRAINT "IncomeReceipt_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
