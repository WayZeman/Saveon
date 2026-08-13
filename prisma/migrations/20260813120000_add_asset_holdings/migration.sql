-- AlterTable
ALTER TABLE "Category" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'other';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "assetSymbol" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "assetName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "assetClass" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "unitPriceUsd" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "quantity" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "usdRateUah" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Transaction_assetSymbol_idx" ON "Transaction"("assetSymbol");
CREATE INDEX "Transaction_userId_assetSymbol_idx" ON "Transaction"("userId", "assetSymbol");
