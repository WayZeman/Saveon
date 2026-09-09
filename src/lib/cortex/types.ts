export const ASSET_TYPES = ["crypto", "stock", "real_estate", "bond", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export type InvestmentRecord = {
  id: string;
  name: string;
  type: AssetType;
  symbol: string | null;
  investedAmount: number;
  investedCurrency: "USD" | "UAH";
  quantity: number | null;
  purchaseDate: string;
  purchaseUnitPrice: number | null;
  purchaseUnitCurrency: string | null;
  monthlyIncome: number | null;
  monthlyIncomeCurrency: string | null;
  estimatedValue: number | null;
  estimatedValueCurrency: string | null;
  annualRate: number | null;
  notes: string | null;
  receipts: IncomeReceipt[];
};

export type IncomeReceipt = {
  id: string;
  amount: number;
  currency: "USD" | "UAH";
  receivedAt: string;
  notes: string | null;
};

export type ValuedInvestment = InvestmentRecord & {
  costUah: number;
  costUsd: number;
  currentUah: number;
  currentUsd: number;
  incomeUah: number;
  incomeUsd: number;
  pnlUah: number;
  pnlUsd: number;
  pnlPct: number;
  quoteLabel: string;
  quoteOk: boolean;
  dailyIncomeUsd: number;
  todayIncomeUsd: number;
  incomeDays: number;
  livePriceUsd: number | null;
};

export type PortfolioSnapshot = {
  updatedAt: string;
  usdUah: number;
  totals: {
    costUah: number;
    costUsd: number;
    currentUah: number;
    currentUsd: number;
    incomeUah: number;
    pnlUah: number;
    pnlUsd: number;
    pnlPct: number;
    dailyIncomeUsd: number;
    todayIncomeUsd: number;
  };
  groups: Record<AssetType, ValuedInvestment[]>;
  investments: ValuedInvestment[];
};

export const TYPE_LABELS: Record<AssetType, string> = {
  crypto: "Крипта",
  stock: "Акції",
  real_estate: "Нерухомість",
  bond: "ОВДП",
  other: "Інше",
};
