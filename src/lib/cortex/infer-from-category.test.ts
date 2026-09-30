import { inferLotFromCategory, lotFromTransaction } from "./infer-from-category";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

assert(inferLotFromCategory("Біткоін")?.symbol === "BTC", "bitcoin uk");
assert(inferLotFromCategory("біткоїн")?.type === "crypto", "bitcoin iotified");
assert(inferLotFromCategory("SPYx")?.symbol === "SPYX", "spyx keeps existing ticker");
assert(inferLotFromCategory("SPY")?.symbol === "SPYX", "spy maps to SPYX");
assert(inferLotFromCategory("CSPX")?.symbol === "CSPX", "cspx");
assert(inferLotFromCategory("NVDAX")?.symbol === "NVDAX", "nvdax");
assert(inferLotFromCategory("ОВДП")?.type === "bond", "ovdp");
assert(inferLotFromCategory("Квартира")?.type === "real_estate", "apartment");
assert(inferLotFromCategory("Їжа") === null, "food is not an asset");
assert(inferLotFromCategory("Готівка") === null, "cash is not an asset");
assert(inferLotFromCategory("Крипта") === null, "generic crypto category is not a lot");
assert(inferLotFromCategory("Акції") === null, "generic stocks category is not a lot");

const btcIncome = lotFromTransaction({ type: "income", categoryName: "Біткоін" });
assert(btcIncome?.symbol === "BTC", "income into bitcoin is a buy");

const cashToBtc = lotFromTransaction({
  type: "expense",
  categoryName: "Біткоін",
  sourceCategoryName: "Готівка",
});
assert(cashToBtc?.symbol === "BTC", "cash → bitcoin expense is a buy");

const btcToFood = lotFromTransaction({
  type: "expense",
  categoryName: "Їжа",
  sourceCategoryName: "Біткоін",
});
assert(btcToFood === null, "sell / spend from bitcoin does not create a lot");

const btcToSpy = lotFromTransaction({
  type: "expense",
  categoryName: "SPYx",
  sourceCategoryName: "Біткоін",
});
assert(btcToSpy === null, "asset → asset transfer does not create a lot");

const foodExpense = lotFromTransaction({
  type: "expense",
  categoryName: "Їжа",
  sourceCategoryName: "Готівка",
});
assert(foodExpense === null, "regular spend does not create a lot");

console.log("infer-from-category tests passed");
