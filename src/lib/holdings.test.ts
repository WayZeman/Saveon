import { inferAssetFromName, inferCategoryKind } from "./assets-catalog";
import { computeHoldings, computeSymbolPositions, cortexTypeForAssetClass, groupInvestments } from "./holdings";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const btc = inferAssetFromName("біткоін");
assert(btc?.symbol === "BTC", `expected BTC from біткоін, got ${btc?.symbol}`);
assert(inferAssetFromName("Bitcoin")?.symbol === "BTC", "Bitcoin should map to BTC");
assert(inferAssetFromName("SPYx")?.symbol === "SPY", `expected SPY from SPYx, got ${inferAssetFromName("SPYx")?.symbol}`);
assert(inferAssetFromName("Акції SPY")?.symbol === "SPY", "Акції SPY should map to SPY");
assert(inferCategoryKind("Біткоін") === "crypto", "BTC category is crypto");
assert(inferCategoryKind("SPYx") === "stock", "SPYx category is stock");

const txs = [
  {
    type: "income",
    amount: 4100,
    categoryId: "btc",
    sourceCategoryId: null,
    categoryName: "Біткоін",
    sourceCategoryName: null,
    assetSymbol: "BTC",
    assetName: "Bitcoin",
    assetClass: "crypto",
    unitPriceUsd: 100000,
    quantity: 0.001,
    usdRateUah: 41,
    createdAt: "2026-09-29T12:00:00.000Z",
  },
  {
    type: "income",
    amount: 8200,
    categoryId: "spy",
    sourceCategoryId: null,
    categoryName: "SPYx",
    sourceCategoryName: null,
    assetSymbol: "SPY",
    assetName: "SPDR S&P 500 ETF",
    assetClass: "etf",
    unitPriceUsd: 500,
    quantity: 0.4,
    usdRateUah: 41,
    createdAt: "2026-09-30T12:00:00.000Z",
  },
];

const holdings = computeHoldings(txs, { BTC: 110000, SPY: 520 }, 41);
assert(holdings.length === 2, `expected 2 holdings, got ${holdings.length}`);
const btcH = holdings.find((h) => h.symbol === "BTC");
const spyH = holdings.find((h) => h.symbol === "SPY");
assert(btcH != null && Math.abs(btcH.quantity - 0.001) < 1e-9, "BTC qty");
assert(btcH != null && btcH.pnlPercent != null && btcH.pnlPercent === 10, `BTC pnl ${btcH?.pnlPercent}`);
assert(spyH != null && Math.abs(spyH.quantity - 0.4) < 1e-9, "SPY qty");
assert(spyH != null && spyH.pnlPercent != null && spyH.pnlPercent === 4, `SPY pnl ${spyH?.pnlPercent}`);

const groups = groupInvestments(holdings);
assert(groups.some((g) => g.key === "crypto" && g.holdings[0].symbol === "BTC"), "crypto group has BTC");
assert(groups.some((g) => g.key === "stock" && g.holdings[0].symbol === "SPY"), "stock group has SPY");

const positions = computeSymbolPositions(txs);
assert(positions.length === 2, `expected 2 cortex positions, got ${positions.length}`);
const btcP = positions.find((p) => p.symbol === "BTC");
const spyP = positions.find((p) => p.symbol === "SPY");
assert(btcP != null && Math.abs(btcP.costUsd - 100) < 1e-9, `BTC costUsd ${btcP?.costUsd}`);
assert(spyP != null && Math.abs(spyP.costUsd - 200) < 1e-9, `SPY costUsd ${spyP?.costUsd}`);
assert(cortexTypeForAssetClass(btcP?.assetClass) === "crypto", "BTC maps to crypto schema");
assert(cortexTypeForAssetClass(spyP?.assetClass) === "stock", "SPYx maps to stock schema");
assert(btcP != null && btcP.firstBoughtAt.toISOString().startsWith("2026-09-29"), "BTC purchase date is yesterday");

const buyExpense = computeHoldings(
  [
    {
      type: "expense",
      amount: 4100,
      categoryId: "btc",
      sourceCategoryId: "cash",
      categoryName: "Біткоін",
      sourceCategoryName: "Готівка",
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      assetClass: "crypto",
      unitPriceUsd: 100000,
      quantity: 0.001,
      usdRateUah: 41,
      createdAt: "2026-09-29T12:00:00.000Z",
    },
  ],
  { BTC: 100000 },
  41
);
assert(buyExpense.length === 1 && buyExpense[0].symbol === "BTC", "expense from cash into BTC still counts as a buy");

const dca = computeSymbolPositions([
  txs[0],
  {
    ...txs[0],
    quantity: 0.001,
    unitPriceUsd: 80000,
    createdAt: "2026-09-30T12:00:00.000Z",
  },
]);
const dcaBtc = dca.find((p) => p.symbol === "BTC");
assert(dcaBtc != null && Math.abs(dcaBtc.quantity - 0.002) < 1e-9, "DCA quantity");
assert(dcaBtc != null && Math.abs(dcaBtc.costUsd - 180) < 1e-9, `DCA locked cost ${dcaBtc?.costUsd}`);

const sold = computeSymbolPositions([
  txs[0],
  {
    type: "expense",
    amount: 4100,
    categoryId: "cash",
    sourceCategoryId: "btc",
    categoryName: "Готівка",
    sourceCategoryName: "Біткоін",
    assetSymbol: "BTC",
    assetName: "Bitcoin",
    assetClass: "crypto",
    unitPriceUsd: 100000,
    quantity: 0.001,
    usdRateUah: 41,
    createdAt: "2026-09-30T12:00:00.000Z",
  },
]);
assert(!sold.some((p) => p.symbol === "BTC"), "selling the full BTC position removes it from the schema");

console.log("investment tests passed");
