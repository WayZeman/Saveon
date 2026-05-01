ALTER TABLE "Category"
ADD COLUMN "marketSymbol" TEXT;

ALTER TABLE "Transaction"
ADD COLUMN "assetSymbol" TEXT,
ADD COLUMN "assetPrice" DOUBLE PRECISION,
ADD COLUMN "assetCurrency" TEXT;
