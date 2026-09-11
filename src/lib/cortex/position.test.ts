import { isAutoEstimatedLot, resolveMarketPosition } from "./position";
import { pickDailyClose } from "./quotes";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function almost(a: number, b: number, eps = 1e-6) {
  assert(Math.abs(a - b) < eps, `expected ${b}, got ${a}`);
}

assert(
  isAutoEstimatedLot({ investedUsd: 10000, quantity: 10000 / 65000, storedEntryUsd: 65000 }),
  "qty from locked close is an auto lot",
);
assert(
  !isAutoEstimatedLot({ investedUsd: 10000, quantity: 0.12, storedEntryUsd: 65000 }),
  "user-entered bag is not an auto lot",
);

const recut = resolveMarketPosition({
  investedUsd: 10000,
  quantity: 10000 / 65000,
  storedEntryUsd: 65000,
  historicalUsd: 67000,
  liveUsd: 77050,
});
almost(recut.entryUsd ?? 0, 67000);
almost(recut.quantity ?? 0, 10000 / 67000);
almost(recut.pnlPct, (77050 / 67000 - 1) * 100, 1e-6);

const userLot = resolveMarketPosition({
  investedUsd: 10000,
  quantity: 0.12,
  storedEntryUsd: 65000,
  historicalUsd: 67000,
  liveUsd: 11531 / 0.12,
});
almost(userLot.quantity ?? 0, 0.12);
almost(userLot.entryUsd ?? 0, 10000 / 0.12, 1e-6);
almost(userLot.pnlPct, 15.31, 1e-4);

const yahooBug = pickDailyClose(
  [1788998400, 1789084800],
  [null, 77082.88],
  new Date("2026-09-10T12:00:00.000Z"),
);
assert(yahooBug === null, `must not take the next day's close, got ${yahooBug}`);

const yahooExact = pickDailyClose(
  [1788220800, 1788307200],
  [77403.625, 77300.47],
  new Date("2026-09-01T12:00:00.000Z"),
);
almost(yahooExact ?? 0, 77403.625);

const yahooWalkBack = pickDailyClose(
  [1788912000, 1789084800],
  [78259.52, 77082.88],
  new Date("2026-09-10T12:00:00.000Z"),
);
almost(yahooWalkBack ?? 0, 78259.52);

const coinbaseNewestFirst = pickDailyClose(
  [1789084800, 1788998400, 1788912000],
  [77074.05, 76536.55, 78283.98],
  new Date("2026-09-10T12:00:00.000Z"),
);
almost(coinbaseNewestFirst ?? 0, 76536.55);

console.log("cortex position tests passed");
