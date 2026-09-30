import { inferCategoryKind } from "./assets-catalog";

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

function isMarketName(name: string | null | undefined): boolean {
  if (!name) return false;
  const kind = inferCategoryKind(name);
  return kind === "stock" || kind === "crypto";
}

function isBuyTransaction(tx: HoldingTx): boolean {
  if (tx.type === "income") return true;
  return isMarketName(tx.categoryName) && !isMarketName(tx.sourceCategoryName);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export type SymbolPosition = {
  symbol: string;
  name: string;
  assetClass: string;
  quantity: number;
  costUsd: number;
  firstBoughtAt: Date;
};

/** Net holdings by ticker (crypto vs stocks), using the price locked on each transaction. */
export function computeSymbolPositions(transactions: HoldingTx[]): SymbolPosition[] {
  const ordered = [...transactions].sort((a, b) => asDate(a.createdAt).getTime() - asDate(b.createdAt).getTime());

  type Acc = {
    symbol: string;
    name: string;
    assetClass: string;
    qty: number;
    costUsd: number;
    firstBoughtAt: Date | null;
  };
  const acc = new Map<string, Acc>();

  function bucket(tx: HoldingTx): Acc | null {
    const symbol = tx.assetSymbol?.trim().toUpperCase();
    if (!symbol) return null;
    const existing = acc.get(symbol);
    if (existing) {
      if (tx.assetName) existing.name = tx.assetName;
      if (tx.assetClass) existing.assetClass = tx.assetClass;
      return existing;
    }
    const created: Acc = {
      symbol,
      name: tx.assetName || symbol,
      assetClass: tx.assetClass || "stock",
      qty: 0,
      costUsd: 0,
      firstBoughtAt: null,
    };
    acc.set(symbol, created);
    return created;
  }

  for (const tx of ordered) {
    const qty = txQuantity(tx);
    const price = tx.unitPriceUsd;
    if (qty == null || price == null || price <= 0) continue;
    const row = bucket(tx);
    if (!row) continue;

    if (isBuyTransaction(tx)) {
      if (!row.firstBoughtAt) row.firstBoughtAt = asDate(tx.createdAt);
      row.qty += qty;
      row.costUsd += qty * price;
    } else if (row.qty > 0) {
      const sold = Math.min(qty, row.qty);
      const avg = row.costUsd / row.qty;
      row.costUsd = Math.max(0, row.costUsd - avg * sold);
      row.qty -= sold;
    }
  }

  const positions: SymbolPosition[] = [];
  for (const row of Array.from(acc.values())) {
    if (row.qty <= 1e-10 || row.costUsd <= 0 || !row.firstBoughtAt) continue;
    positions.push({
      symbol: row.symbol,
      name: row.name,
      assetClass: row.assetClass,
      quantity: row.qty,
      costUsd: row.costUsd,
      firstBoughtAt: row.firstBoughtAt,
    });
  }
  return positions.sort((a, b) => b.costUsd - a.costUsd);
}

export function cortexTypeForAssetClass(assetClass: string | null | undefined): "crypto" | "stock" {
  return assetClass === "crypto" ? "crypto" : "stock";
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

    if (isBuyTransaction(tx)) {
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

export type InvestmentGroup = {
  key: "crypto" | "stock";
  holdings: AssetHolding[];
  investedUah: number;
  currentValueUah: number;
  pnlPercent: number | null;
};

export function groupInvestments(holdings: AssetHolding[]): InvestmentGroup[] {
  const crypto = holdings.filter((h) => h.assetClass === "crypto");
  const stock = holdings.filter((h) => h.assetClass !== "crypto");

  function pack(key: "crypto" | "stock", list: AssetHolding[]): InvestmentGroup | null {
    if (list.length === 0) return null;
    const investedUah = round2(list.reduce((s, h) => s + h.investedUah, 0));
    const currentValueUah = round2(list.reduce((s, h) => s + h.currentValueUah, 0));
    const weight = list.reduce((s, h) => s + h.currentValueUah, 0);
    const pnlPercent =
      weight > 0
        ? round2(list.reduce((s, h) => s + (h.pnlPercent ?? 0) * h.currentValueUah, 0) / weight)
        : null;
    return { key, holdings: list, investedUah, currentValueUah, pnlPercent };
  }

  return [pack("crypto", crypto), pack("stock", stock)].filter((g): g is InvestmentGroup => g != null);
}
