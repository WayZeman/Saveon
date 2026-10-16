import { roundCents } from "./money";
import type { PortfolioSnapshot, ValuedInvestment } from "./types";

export const PROJECT_HORIZONS = [1, 3, 5, 10, 20] as const;
export type ProjectHorizon = (typeof PROJECT_HORIZONS)[number];

const DAYS_PER_YEAR = 365.25;

export type ProjectedValue = {
  years: number;
  valueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  /** How the projection was built */
  mode: "compound" | "income" | "flat";
};

/** Project one lot forward. Uses annualRate (compound on current value) or daily income stream. */
export function projectInvestment(item: ValuedInvestment, years: number): ProjectedValue {
  if (years <= 0) {
    return {
      years: 0,
      valueUsd: item.currentUsd,
      pnlUsd: item.pnlUsd,
      pnlPct: item.pnlPct,
      mode: "flat",
    };
  }

  let valueUsd = item.currentUsd;
  let mode: ProjectedValue["mode"] = "flat";

  if (item.annualRate && item.annualRate > 0) {
    valueUsd = item.currentUsd * Math.pow(1 + item.annualRate / 100, years);
    mode = "compound";
  } else if (item.dailyIncomeUsd > 0) {
    valueUsd = item.currentUsd + item.dailyIncomeUsd * DAYS_PER_YEAR * years;
    mode = "income";
  }

  valueUsd = roundCents(valueUsd);
  const pnlUsd = roundCents(valueUsd - item.costUsd);
  const pnlPct = item.costUsd === 0 ? 0 : (pnlUsd / item.costUsd) * 100;
  return { years, valueUsd, pnlUsd, pnlPct, mode };
}

export function projectPortfolio(snapshot: PortfolioSnapshot, years: number): ProjectedValue {
  if (years <= 0) {
    return {
      years: 0,
      valueUsd: snapshot.totals.currentUsd,
      pnlUsd: snapshot.totals.pnlUsd,
      pnlPct: snapshot.totals.pnlPct,
      mode: "flat",
    };
  }

  const parts = snapshot.investments.map((item) => projectInvestment(item, years));
  const valueUsd = roundCents(parts.reduce((sum, p) => sum + p.valueUsd, 0));
  const costUsd = snapshot.totals.costUsd;
  const pnlUsd = roundCents(valueUsd - costUsd);
  const pnlPct = costUsd === 0 ? 0 : (pnlUsd / costUsd) * 100;
  const mode = parts.some((p) => p.mode === "compound")
    ? "compound"
    : parts.some((p) => p.mode === "income")
      ? "income"
      : "flat";
  return { years, valueUsd, pnlUsd, pnlPct, mode };
}

export function horizonHint(mode: ProjectedValue["mode"], annualRate?: number | null) {
  if (mode === "compound" && annualRate && annualRate > 0) {
    return `складний % ${annualRate}% річних від поточної вартості`;
  }
  if (mode === "income") return "поточна вартість + очікуваний дохід";
  return "без ставки — вартість як зараз";
}
