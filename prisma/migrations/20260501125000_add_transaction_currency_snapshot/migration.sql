ALTER TABLE "Transaction"
ADD COLUMN "originalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "originalCurrency" TEXT NOT NULL DEFAULT 'UAH',
ADD COLUMN "exchangeRateToUah" DOUBLE PRECISION NOT NULL DEFAULT 1;

UPDATE "Transaction"
SET
  "originalAmount" = "amount",
  "originalCurrency" = 'UAH',
  "exchangeRateToUah" = 1
WHERE "originalAmount" = 0;
