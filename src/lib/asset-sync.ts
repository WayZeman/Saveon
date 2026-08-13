import { prisma } from "./prisma";
import { inferAssetFromName, inferCategoryKind } from "./assets-catalog";
import { snapshotAssetPurchase } from "./asset-prices";

const PRICE_BACKFILL_LIMIT = 12;

export async function syncCategoryKinds(categoryIds?: string[]): Promise<number> {
  const categories = await prisma.category.findMany({
    where: {
      kind: "other",
      ...(categoryIds ? { id: { in: categoryIds } } : {}),
    },
    select: { id: true, name: true, kind: true },
  });
  let updated = 0;
  for (const category of categories) {
    const kind = inferCategoryKind(category.name);
    if (kind === "other") continue;
    await prisma.category.update({ where: { id: category.id }, data: { kind } });
    updated += 1;
  }
  return updated;
}

export async function attachAssetsFromCategoryNames(userIds: string[]): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, assetSymbol: null },
    select: {
      id: true,
      type: true,
      category: { select: { name: true } },
      sourceCategory: { select: { name: true } },
    },
  });
  let updated = 0;
  for (const tx of transactions) {
    const name = tx.type === "income" ? tx.category.name : (tx.sourceCategory?.name ?? tx.category.name);
    const asset = inferAssetFromName(name);
    if (!asset) continue;
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        assetSymbol: asset.symbol,
        assetName: asset.name,
        assetClass: asset.class,
      },
    });
    updated += 1;
  }
  return updated;
}

export async function fillMissingHistoricalPrices(userIds: string[]): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds },
      assetSymbol: { not: null },
      OR: [{ unitPriceUsd: null }, { quantity: null }, { usdRateUah: null }],
    },
    select: {
      id: true,
      amount: true,
      assetSymbol: true,
      assetName: true,
      assetClass: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: PRICE_BACKFILL_LIMIT,
  });

  let updated = 0;
  for (const tx of transactions) {
    if (!tx.assetSymbol) continue;
    const snapshot = await snapshotAssetPurchase({
      symbol: tx.assetSymbol,
      name: tx.assetName ?? undefined,
      assetClass: tx.assetClass,
      amountUah: tx.amount,
      at: tx.createdAt,
    });
    if (!snapshot) continue;
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        assetSymbol: snapshot.assetSymbol,
        assetName: snapshot.assetName,
        assetClass: snapshot.assetClass,
        unitPriceUsd: snapshot.unitPriceUsd,
        quantity: snapshot.quantity,
        usdRateUah: snapshot.usdRateUah,
      },
    });
    updated += 1;
  }
  return updated;
}

export async function syncHoldingsForUsers(userIds: string[]): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: { in: userIds } }, { createdBy: { in: userIds } }, { isShared: true, userId: null }],
      },
      select: { id: true },
    });
    await syncCategoryKinds(categories.map((c) => c.id));
    await attachAssetsFromCategoryNames(userIds);
    await fillMissingHistoricalPrices(userIds);
  } catch (error) {
    console.error("asset sync failed", error);
  }
}
