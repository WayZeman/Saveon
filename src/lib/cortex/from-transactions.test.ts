import { recordsFromTransactions, saveonAssetId } from "./from-transactions";
import type { HoldingTx } from "../holdings";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const btcBuy = (extra: Partial<HoldingTx> = {}): HoldingTx => ({
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
  ...extra,
});

const spyBuy: HoldingTx = {
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
};

const records = recordsFromTransactions([
  btcBuy(),
  btcBuy({ categoryId: "btc-2", createdAt: "2026-09-30T12:00:00.000Z" }),
  spyBuy,
]);

assert(records.length === 2, `expected 2 schema nodes, got ${records.length}`);
assert(records.filter((r) => r.symbol === "BTC").length === 1, "BTC must appear once");
assert(records.filter((r) => r.symbol === "SPY").length === 1, "SPY must appear once");
const btc = records.find((r) => r.symbol === "BTC")!;
const spy = records.find((r) => r.symbol === "SPY")!;
assert(btc.id === saveonAssetId("BTC"), "BTC id");
assert(btc.type === "crypto" && spy.type === "stock", "sections");
assert(Math.abs(btc.investedAmount - 200) < 1e-9, `BTC combined ${btc.investedAmount}`);
assert(Math.abs(spy.investedAmount - 200) < 1e-9, `SPY ${spy.investedAmount}`);
assert(new Set(records.map((r) => r.id)).size === records.length, "ids must be unique");

console.log("from-transactions tests passed");
