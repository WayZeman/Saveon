import { prisma } from "./prisma";

let ready: Promise<void> | null = null;

async function applyAssetColumns() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'other'`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "assetSymbol" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "assetName" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "assetClass" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "unitPriceUsd" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "usdRateUah" DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Transaction_assetSymbol_idx" ON "Transaction"("assetSymbol")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Transaction_userId_assetSymbol_idx" ON "Transaction"("userId", "assetSymbol")`
  );
}

export async function ensureAssetSchema() {
  if (!ready) {
    ready = applyAssetColumns().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
