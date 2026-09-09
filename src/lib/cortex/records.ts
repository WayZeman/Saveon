import type { AssetType, IncomeReceipt, InvestmentRecord } from "@/lib/cortex/types";

export function toInvestmentRecord(row: {
  id: string;
  name: string;
  type: string;
  symbol: string | null;
  investedAmount: number;
  investedCurrency: string;
  quantity: number | null;
  purchaseDate: Date;
  purchaseUnitPrice: number | null;
  purchaseUnitCurrency: string | null;
  monthlyIncome: number | null;
  monthlyIncomeCurrency: string | null;
  estimatedValue: number | null;
  estimatedValueCurrency: string | null;
  annualRate: number | null;
  notes: string | null;
  receipts?: Array<{
    id: string;
    amount: number;
    currency: string;
    receivedAt: Date;
    notes: string | null;
  }>;
}): InvestmentRecord {
  const receipts: IncomeReceipt[] = (row.receipts ?? []).map((receipt) => ({
    id: receipt.id,
    amount: receipt.amount,
    currency: receipt.currency === "UAH" ? "UAH" : "USD",
    receivedAt: receipt.receivedAt.toISOString(),
    notes: receipt.notes,
  }));
  return {
    id: row.id,
    name: row.name,
    type: row.type as AssetType,
    symbol: row.symbol,
    investedAmount: row.investedAmount,
    investedCurrency: row.investedCurrency as "USD" | "UAH",
    quantity: row.quantity,
    purchaseDate: row.purchaseDate.toISOString(),
    purchaseUnitPrice: row.purchaseUnitPrice,
    purchaseUnitCurrency: row.purchaseUnitCurrency,
    monthlyIncome: row.monthlyIncome,
    monthlyIncomeCurrency: row.monthlyIncomeCurrency,
    estimatedValue: row.estimatedValue,
    estimatedValueCurrency: row.estimatedValueCurrency,
    annualRate: row.annualRate,
    notes: row.notes,
    receipts,
  };
}
