export type HoldingTx = {
  type: string;
  amount: number;
  categoryId: string;
  sourceCategoryId: string | null;
  categoryName: string;
  sourceCategoryName: string | null;
  assetSymbol: string | null;
  assetName: string | null;
  assetClass: string | null;
  unitPriceUsd: number | null;
  quantity: number | null;
  usdRateUah: number | null;
  createdAt: Date | string;
};

export type AssetHolding = {
  categoryId: string;
  categoryName: string;
  symbol: string;
  name: string;
  assetClass: string;
  quantity: number;
  avgPriceUsd: number;
  currentPriceUsd: number | null;
  pnlPercent: number | null;
  investedUah: number;
  currentValueUah: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function txQuantity(tx: HoldingTx): number | null {
  if (tx.quantity != null && tx.quantity > 0) return tx.quantity;
  if (tx.unitPriceUsd && tx.unitPriceUsd > 0 && tx.usdRateUah && tx.usdRateUah > 0 && tx.amount > 0) {
    return tx.amount / tx.usdRateUah / tx.unitPriceUsd;
  }
  return null;
}

function holdingKey(categoryId: string, symbol: string): string {
  return `${categoryId}::${symbol}`;
}

export function computeHoldings(
  transactions: HoldingTx[],
  currentPricesUsd: Record<string, number>,
  usdUah: number
): AssetHolding[] {
  const ordered = [...transactions].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return da - db;
  });

  type Acc = {
    categoryId: string;
    categoryName: string;
    symbol: string;
    name: string;
    assetClass: string;
    qty: number;
    costUsd: number;
  };
  const acc = new Map<string, Acc>();

  function bucket(categoryId: string, categoryName: string, tx: HoldingTx): Acc | null {
    const symbol = tx.assetSymbol?.toUpperCase();
    if (!symbol) return null;
    const key = holdingKey(categoryId, symbol);
    const existing = acc.get(key);
    if (existing) return existing;
    const created: Acc = {
      categoryId,
      categoryName,
      symbol,
      name: tx.assetName || symbol,
      assetClass: tx.assetClass || "stock",
      qty: 0,
      costUsd: 0,
    };
    acc.set(key, created);
    return created;
  }

  for (const tx of ordered) {
    const qty = txQuantity(tx);
    const price = tx.unitPriceUsd;
    if (qty == null || price == null || price <= 0) continue;

    if (tx.type === "income") {
      const row = bucket(tx.categoryId, tx.categoryName, tx);
      if (!row) continue;
      row.qty += qty;
      row.costUsd += qty * price;
      if (tx.assetName) row.name = tx.assetName;
    } else {
      const categoryId = tx.sourceCategoryId ?? tx.categoryId;
      const categoryName = tx.sourceCategoryName ?? tx.categoryName;
      const row = bucket(categoryId, categoryName, tx);
      if (!row || row.qty <= 0) continue;
      const sold = Math.min(qty, row.qty);
      const avg = row.costUsd / row.qty;
      row.costUsd = Math.max(0, row.costUsd - avg * sold);
      row.qty -= sold;
    }
  }

  const holdings: AssetHolding[] = [];
  for (const row of Array.from(acc.values())) {
    if (row.qty <= 1e-10) continue;
    const avgPriceUsd = row.costUsd / row.qty;
    const currentPriceUsd = currentPricesUsd[row.symbol] ?? null;
    const pnlPercent =
      currentPriceUsd != null && avgPriceUsd > 0
        ? round2(((currentPriceUsd - avgPriceUsd) / avgPriceUsd) * 100)
        : null;
    const investedUah = row.costUsd * usdUah;
    const currentValueUah = currentPriceUsd != null ? row.qty * currentPriceUsd * usdUah : investedUah;
    holdings.push({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      symbol: row.symbol,
      name: row.name,
      assetClass: row.assetClass,
      quantity: row.qty,
      avgPriceUsd: round2(avgPriceUsd),
      currentPriceUsd: currentPriceUsd != null ? round2(currentPriceUsd) : null,
      pnlPercent,
      investedUah: round2(investedUah),
      currentValueUah: round2(currentValueUah),
    });
  }

  return holdings.sort((a, b) => b.currentValueUah - a.currentValueUah);
}

export function formatPnlPercent(percent: number): string {
  const abs = Math.abs(percent).toFixed(1).replace(/\.0$/, "");
  return `${percent >= 0 ? "+" : "−"}${abs}%`;
}
