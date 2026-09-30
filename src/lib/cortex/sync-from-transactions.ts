import { prisma } from "@/lib/prisma";
import {
  computeSymbolPositions,
  cortexTypeForAssetClass,
  type HoldingTx,
} from "@/lib/holdings";

export const SAVEON_ASSET_NOTE_PREFIX = "saveon:asset:";

export function saveonAssetNote(symbol: string): string {
  return `${SAVEON_ASSET_NOTE_PREFIX}${symbol.trim().toUpperCase()}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

function sameNumber(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 1e-8;
}

function toHoldingTx(tx: {
  type: string;
  amount: number;
  categoryId: string;
  sourceCategoryId: string | null;
  category: { name: string } | null;
  sourceCategory: { name: string } | null;
  assetSymbol: string | null;
  assetName: string | null;
  assetClass: string | null;
  unitPriceUsd: number | null;
  quantity: number | null;
  usdRateUah: number | null;
  createdAt: Date;
}): HoldingTx {
  return {
    type: tx.type,
    amount: tx.amount,
    categoryId: tx.categoryId,
    sourceCategoryId: tx.sourceCategoryId,
    categoryName: tx.category?.name ?? "Інше",
    sourceCategoryName: tx.sourceCategory?.name ?? null,
    assetSymbol: tx.assetSymbol,
    assetName: tx.assetName,
    assetClass: tx.assetClass,
    unitPriceUsd: tx.unitPriceUsd,
    quantity: tx.quantity,
    usdRateUah: tx.usdRateUah,
    createdAt: tx.createdAt,
  };
}

export async function syncCortexInvestmentsForUsers(userIds: string[]): Promise<void> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const userId of unique) {
    await syncCortexInvestmentsForUser(userId);
  }
}

async function syncCortexInvestmentsForUser(userId: string): Promise<void> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, assetSymbol: { not: null } },
    select: {
      type: true,
      amount: true,
      categoryId: true,
      sourceCategoryId: true,
      assetSymbol: true,
      assetName: true,
      assetClass: true,
      unitPriceUsd: true,
      quantity: true,
      usdRateUah: true,
      createdAt: true,
      category: { select: { name: true } },
      sourceCategory: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const positions = computeSymbolPositions(transactions.map(toHoldingTx));
  const existing = await prisma.investment.findMany({
    where: { userId, notes: { startsWith: SAVEON_ASSET_NOTE_PREFIX } },
  });
  const byNote = new Map(existing.map((row) => [row.notes ?? "", row]));
  const keep = new Set<string>();

  for (const position of positions) {
    const notes = saveonAssetNote(position.symbol);
    keep.add(notes);
    const type = cortexTypeForAssetClass(position.assetClass);
    const purchaseUnitPrice = round2(position.costUsd / position.quantity);
    const data = {
      name: position.name,
      type,
      symbol: position.symbol,
      investedAmount: round2(position.costUsd),
      investedCurrency: "USD",
      quantity: round8(position.quantity),
      purchaseDate: position.firstBoughtAt,
      purchaseUnitPrice,
      purchaseUnitCurrency: "USD",
      notes,
    };
    const row = byNote.get(notes);
    if (row) {
      const unchanged =
        row.name === data.name &&
        row.type === data.type &&
        row.symbol === data.symbol &&
        sameNumber(row.investedAmount, data.investedAmount) &&
        row.investedCurrency === data.investedCurrency &&
        sameNumber(row.quantity, data.quantity) &&
        row.purchaseDate.getTime() === data.purchaseDate.getTime() &&
        sameNumber(row.purchaseUnitPrice, data.purchaseUnitPrice) &&
        row.purchaseUnitCurrency === data.purchaseUnitCurrency;
      if (unchanged) continue;
      await prisma.investment.update({ where: { id: row.id }, data });
    } else {
      await prisma.investment.create({ data: { userId, ...data } });
    }
  }

  for (const row of existing) {
    if (!row.notes || keep.has(row.notes)) continue;
    await prisma.investment.delete({ where: { id: row.id } });
  }
}
