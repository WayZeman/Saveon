/** Auto-estimated lots were stored as quantity ≈ invested / lockedDailyClose. */
const AUTO_LOT_TOLERANCE = 0.005;

export function isAutoEstimatedLot(opts: {
  investedUsd: number;
  quantity: number | null | undefined;
  storedEntryUsd: number | null | undefined;
}) {
  if (opts.quantity == null || opts.quantity <= 0) return true;
  if (opts.storedEntryUsd == null || opts.storedEntryUsd <= 0) return false;
  if (opts.investedUsd <= 0) return false;
  const implied = opts.quantity * opts.storedEntryUsd;
  return Math.abs(implied - opts.investedUsd) / opts.investedUsd < AUTO_LOT_TOLERANCE;
}

export function resolveMarketPosition(opts: {
  investedUsd: number;
  quantity: number | null | undefined;
  storedEntryUsd: number | null | undefined;
  historicalUsd: number | null | undefined;
  liveUsd: number;
}) {
  const investedUsd = opts.investedUsd;
  const liveUsd = opts.liveUsd;
  const autoLot = isAutoEstimatedLot(opts);

  let quantity = opts.quantity && opts.quantity > 0 ? opts.quantity : null;
  let entryUsd = opts.storedEntryUsd && opts.storedEntryUsd > 0 ? opts.storedEntryUsd : null;

  if (autoLot && opts.historicalUsd && opts.historicalUsd > 0 && investedUsd > 0) {
    quantity = investedUsd / opts.historicalUsd;
    entryUsd = opts.historicalUsd;
  } else if (quantity && investedUsd > 0) {
    entryUsd = investedUsd / quantity;
  } else if (entryUsd && investedUsd > 0) {
    quantity = investedUsd / entryUsd;
  }

  const qty = quantity ?? 0;
  const currentUsd = qty * liveUsd;
  const pnlUsd = currentUsd - investedUsd;
  const pnlPct = investedUsd === 0 ? 0 : (pnlUsd / investedUsd) * 100;

  return {
    quantity: qty || null,
    entryUsd,
    costUsd: investedUsd,
    currentUsd,
    pnlUsd,
    pnlPct,
  };
}
