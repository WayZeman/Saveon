import { excludeInternalTransfers, sumIncomeExpense } from "./cashflow";

function tx(
  type: "income" | "expense",
  amount: number,
  categoryId: string,
  sourceCategoryId: string | null,
  createdAt = "2026-03-01T10:00:00.000Z",
  userId = "u1"
) {
  return { type, amount, categoryId, sourceCategoryId, createdAt, userId };
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const cash = "cash";
const btc = "btc";
const food = "food";

const deposit = tx("income", 1000, cash, null, "2026-03-01T09:00:00.000Z");
const moveOut = tx("expense", 400, btc, cash, "2026-03-01T10:00:00.000Z");
const moveIn = tx("income", 400, btc, null, "2026-03-01T10:00:01.000Z");
const lunch = tx("expense", 50, food, cash, "2026-03-02T12:00:00.000Z");

const naive = sumIncomeExpense([deposit, moveOut, moveIn, lunch]);
assert(naive.income === 1400, `naive income ${naive.income}`);
assert(naive.expense === 450, `naive expense ${naive.expense}`);

const external = excludeInternalTransfers([deposit, moveOut, moveIn, lunch]);
const sums = sumIncomeExpense(external);
assert(sums.income === 1000, `external income ${sums.income} (got ${JSON.stringify(external)})`);
assert(sums.expense === 50, `external expense ${sums.expense}`);

const onlyDeposit = excludeInternalTransfers([deposit]);
assert(sumIncomeExpense(onlyDeposit).income === 1000, "solo deposit counts");

const afterDeleteMoveIn = excludeInternalTransfers([deposit, moveOut, lunch]);
const after = sumIncomeExpense(afterDeleteMoveIn);
assert(after.income === 1000, `after deleting BTC income, income ${after.income}`);
assert(after.expense === 450, `unpaired move-out becomes a normal expense ${after.expense}`);

const afterDeleteBothLegs = excludeInternalTransfers([deposit, lunch]);
const afterBoth = sumIncomeExpense(afterDeleteBothLegs);
assert(afterBoth.income === 1000, `after deleting transfer pair, income ${afterBoth.income}`);
assert(afterBoth.expense === 50, `after deleting transfer pair, expense ${afterBoth.expense}`);

const moveOut2 = tx("expense", 400, btc, cash, "2026-03-03T10:00:00.000Z");
const moveIn2 = tx("income", 400, btc, null, "2026-03-03T10:00:01.000Z");
const twoMoves = excludeInternalTransfers([deposit, moveOut, moveIn, moveOut2, moveIn2, lunch]);
const twoSums = sumIncomeExpense(twoMoves);
assert(twoSums.income === 1000, `two same-amount transfers still count deposit once ${twoSums.income}`);
assert(twoSums.expense === 50, `two same-amount transfers hide both pairs ${twoSums.expense}`);

console.log("cashflow tests passed");
