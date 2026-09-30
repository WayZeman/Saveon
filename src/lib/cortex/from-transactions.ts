import type { InvestmentRecord } from "./types";
import {
  computeSymbolPositions,
  cortexTypeForAssetClass,
  type HoldingTx,
  type SymbolPosition,
} from "../holdings";

export const SAVEON_ASSET_ID_PREFIX = "saveon:";

export function saveonAssetId(symbol: string): string {
  return `${SAVEON_ASSET_ID_PREFIX}${symbol.trim().toUpperCase()}`;
}

export function isSaveonAssetId(id: string): boolean {
  return id.startsWith(SAVEON_ASSET_ID_PREFIX);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

export function toHoldingTx(tx: {
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
  createdAt: Date | string;
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

export function recordFromPosition(position: SymbolPosition): InvestmentRecord {
  return {
    id: saveonAssetId(position.symbol),
    name: position.name,
    type: cortexTypeForAssetClass(position.assetClass),
    symbol: position.symbol,
    investedAmount: round2(position.costUsd),
    investedCurrency: "USD",
    quantity: round8(position.quantity),
    purchaseDate: position.firstBoughtAt.toISOString(),
    purchaseUnitPrice: round2(position.costUsd / position.quantity),
    purchaseUnitCurrency: "USD",
    monthlyIncome: null,
    monthlyIncomeCurrency: null,
    estimatedValue: null,
    estimatedValueCurrency: null,
    annualRate: null,
    notes: null,
    receipts: [],
  };
}

/** One Cortex node per ticker, built only from Saveon transactions. */
export function recordsFromTransactions(transactions: HoldingTx[]): InvestmentRecord[] {
  return computeSymbolPositions(transactions).map(recordFromPosition);
}
