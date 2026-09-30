import { resolveStockTicker } from "./quotes";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

assert(resolveStockTicker("SPYx") === "SPY", "SPYx quotes as SPY");
assert(resolveStockTicker("spy x") === "SPY", "SPY x alias");
assert(resolveStockTicker("NVDAX") === "NVDA", "NVDAX alias");
console.log("quotes alias tests passed");
