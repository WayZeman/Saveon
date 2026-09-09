import type { AssetType, InvestmentRecord, PortfolioSnapshot, ValuedInvestment } from "./types";
import { roundCents } from "./money";
import { currentMarketQuote, getUsdUah } from "./quotes";

const MS_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;
const DAYS_PER_MONTH = 30.4375;

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function costBasisUsd(item: InvestmentRecord) {
  if (item.quantity && item.purchaseUnitPrice && item.purchaseUnitPrice > 0 && item.purchaseUnitCurrency === "USD") {
    return item.quantity * item.purchaseUnitPrice;
  }
  if (item.investedCurrency === "USD") return item.investedAmount;
  const buyFx = await getUsdUah(new Date(item.purchaseDate));
  return item.investedAmount / buyFx;
}

function shares(item: InvestmentRecord, costUsd: number) {
  if (item.quantity && item.quantity > 0) return item.quantity;
  if (item.purchaseUnitPrice && item.purchaseUnitPrice > 0 && item.purchaseUnitCurrency === "USD") {
    return costUsd / item.purchaseUnitPrice;
  }
  return null;
}

async function accrueDaily(opts: {
  dailyNative: number;
  currency: string;
  startMs: number;
  nowMs: number;
  todayStart: number;
  usdUah: number;
}) {
  const todayElapsed = Math.min(MS_DAY, Math.max(0, opts.nowMs - Math.max(opts.startMs, opts.todayStart)));
  const incomeDays = Math.max(0, (opts.nowMs - opts.startMs) / MS_DAY);
  if (opts.currency === "UAH") {
    const dailyIncomeUsd = opts.dailyNative / opts.usdUah;
    const todayIncomeUsd = (opts.dailyNative * (todayElapsed / MS_DAY)) / opts.usdUah;
    const incomeUah = opts.dailyNative * incomeDays;
    const pastDays = Math.max(0, Math.floor((opts.todayStart - opts.startMs) / MS_DAY));
    const rates = await Promise.all(
      Array.from({ length: pastDays }, (_, i) => getUsdUah(new Date(opts.startMs + i * MS_DAY))),
    );
    const incomeUsd = rates.reduce((sum, rate) => sum + opts.dailyNative / rate, 0) + todayIncomeUsd;
    return { dailyIncomeUsd, todayIncomeUsd, incomeUsd, incomeUah, incomeDays };
  }
  const dailyIncomeUsd = opts.dailyNative;
  const todayIncomeUsd = dailyIncomeUsd * (todayElapsed / MS_DAY);
  const incomeUsd = dailyIncomeUsd * incomeDays;
  return { dailyIncomeUsd, todayIncomeUsd, incomeUsd, incomeUah: incomeUsd * opts.usdUah, incomeDays };
}

export async function valuePortfolio(records: InvestmentRecord[]): Promise<PortfolioSnapshot> {
  const usdUah = await getUsdUah();
  const now = new Date();
  const nowMs = now.getTime();
  const todayStart = startOfUtcDay(now);

  const investments: ValuedInvestment[] = await Promise.all(
    records.map(async (item) => {
      let quoteOk = true;
      let quoteLabel = "фіксована вартість";
      let marketUsd = 0;
      let livePriceUsd: number | null = null;

      const costUsd = await costBasisUsd(item);
      const startMs = startOfUtcDay(new Date(item.purchaseDate));

      if (item.type === "bond") {
        const buyFx = await getUsdUah(new Date(item.purchaseDate));
        const principalUah =
          item.investedCurrency === "UAH" ? item.investedAmount : costUsd * buyFx;
        const incomeDays = Math.max(0, (nowMs - startMs) / MS_DAY);
        const todayElapsed = Math.min(MS_DAY, Math.max(0, nowMs - Math.max(startMs, todayStart)));
        const dailyUah =
          item.annualRate && item.annualRate > 0
            ? (principalUah * (item.annualRate / 100)) / DAYS_PER_YEAR
            : 0;
        const incomeUah = dailyUah * incomeDays;
        const currentUah = principalUah + incomeUah;
        const valuedCostUsd = roundCents(principalUah / buyFx);
        const currentUsd = roundCents(currentUah / usdUah);
        const incomeUsd = roundCents(incomeUah / usdUah);
        const pnlUsd = roundCents(currentUsd - valuedCostUsd);
        return {
          ...item,
          costUah: roundCents(principalUah),
          costUsd: valuedCostUsd,
          currentUah: roundCents(currentUah),
          currentUsd,
          incomeUah: roundCents(incomeUah),
          incomeUsd,
          pnlUah: roundCents(incomeUah),
          pnlUsd,
          pnlPct: valuedCostUsd === 0 ? 0 : (pnlUsd / valuedCostUsd) * 100,
          quoteLabel: `${item.annualRate ? `${item.annualRate}% · ` : ""}НБУ ${usdUah.toFixed(4)} · +${dailyUah.toFixed(1)} грн/день`,
          quoteOk: true,
          dailyIncomeUsd: roundCents(dailyUah / usdUah),
          todayIncomeUsd: roundCents((dailyUah * (todayElapsed / MS_DAY)) / usdUah),
          incomeDays,
          livePriceUsd: null,
        };
      }

      const costUah = item.investedCurrency === "UAH" ? item.investedAmount : costUsd * usdUah;

      try {
        if (item.type === "crypto" || item.type === "stock") {
          const live = await currentMarketQuote(item);
          const qty = shares(item, costUsd);
          if (live?.price && qty) {
            livePriceUsd = live.price;
            marketUsd = qty * live.price;
            quoteLabel = live.label;
          } else if (live) {
            marketUsd = costUsd;
            quoteLabel = live.label;
            quoteOk = false;
          } else {
            marketUsd = costUsd;
            quoteOk = false;
            quoteLabel = "немає котирування";
          }
        } else if (item.type === "real_estate") {
          if (item.estimatedValue != null && item.estimatedValueCurrency) {
            marketUsd =
              item.estimatedValueCurrency === "USD"
                ? item.estimatedValue
                : item.estimatedValue / usdUah;
            quoteLabel = "оцінка ринку";
          } else {
            marketUsd = costUsd;
            quoteLabel = "вартість покупки";
          }
        } else {
          marketUsd = costUsd;
        }
      } catch (error) {
        quoteOk = false;
        marketUsd = costUsd;
        quoteLabel = error instanceof Error ? error.message : "немає котирування";
      }

      let dailyNative = 0;
      let incomeCurrency = item.monthlyIncomeCurrency ?? item.investedCurrency;

      if (item.type !== "real_estate" && item.annualRate && item.annualRate > 0) {
        dailyNative = item.investedAmount * (item.annualRate / 100) / DAYS_PER_YEAR;
        incomeCurrency = item.investedCurrency;
      } else if (item.type !== "real_estate" && item.monthlyIncome && item.monthlyIncome > 0) {
        dailyNative = item.monthlyIncome / DAYS_PER_MONTH;
        incomeCurrency = item.monthlyIncomeCurrency ?? "UAH";
      }

      const accrued =
        dailyNative > 0
          ? await accrueDaily({
              dailyNative,
              currency: incomeCurrency,
              startMs,
              nowMs,
              todayStart,
              usdUah,
            })
          : { dailyIncomeUsd: 0, todayIncomeUsd: 0, incomeUsd: 0, incomeUah: 0, incomeDays: 0 };

      for (const receipt of item.receipts) {
        const when = new Date(receipt.receivedAt);
        const usd =
          receipt.currency === "USD" ? receipt.amount : receipt.amount / (await getUsdUah(when));
        const uah = receipt.currency === "UAH" ? receipt.amount : receipt.amount * usdUah;
        accrued.incomeUsd += usd;
        accrued.incomeUah += uah;
        if (startOfUtcDay(when) === todayStart) accrued.todayIncomeUsd += usd;
      }

      if (item.type === "real_estate") {
        quoteLabel = item.receipts.length
          ? `оренда ${item.receipts.length} надходж.`
          : "вартість покупки";
      }

      const currentUsd = roundCents(marketUsd + accrued.incomeUsd);
      const valuedCostUsd = roundCents(costUsd);
      const pnlUsd = roundCents(currentUsd - valuedCostUsd);

      return {
        ...item,
        costUah: roundCents(costUah),
        costUsd: valuedCostUsd,
        currentUah: roundCents(currentUsd * usdUah),
        currentUsd,
        incomeUah: roundCents(accrued.incomeUah),
        incomeUsd: roundCents(accrued.incomeUsd),
        pnlUah: roundCents(currentUsd * usdUah - costUah),
        pnlUsd,
        pnlPct: valuedCostUsd === 0 ? 0 : (pnlUsd / valuedCostUsd) * 100,
        quoteLabel,
        quoteOk,
        dailyIncomeUsd: roundCents(accrued.dailyIncomeUsd),
        todayIncomeUsd: roundCents(accrued.todayIncomeUsd),
        incomeDays: accrued.incomeDays,
        livePriceUsd,
      };
    }),
  );

  const totals = investments.reduce(
    (acc, item) => {
      acc.costUah += item.costUah;
      acc.costUsd += item.costUsd;
      acc.currentUah += item.currentUah;
      acc.currentUsd += item.currentUsd;
      acc.incomeUah += item.incomeUah;
      acc.pnlUah += item.pnlUah;
      acc.pnlUsd += item.pnlUsd;
      acc.dailyIncomeUsd += item.dailyIncomeUsd;
      acc.todayIncomeUsd += item.todayIncomeUsd;
      return acc;
    },
    {
      costUah: 0,
      costUsd: 0,
      currentUah: 0,
      currentUsd: 0,
      incomeUah: 0,
      pnlUah: 0,
      pnlUsd: 0,
      pnlPct: 0,
      dailyIncomeUsd: 0,
      todayIncomeUsd: 0,
    },
  );
  totals.costUsd = roundCents(totals.costUsd);
  totals.currentUsd = roundCents(totals.currentUsd);
  totals.pnlUsd = roundCents(totals.pnlUsd);
  totals.dailyIncomeUsd = roundCents(totals.dailyIncomeUsd);
  totals.todayIncomeUsd = roundCents(totals.todayIncomeUsd);
  totals.costUah = roundCents(totals.costUah);
  totals.currentUah = roundCents(totals.currentUah);
  totals.pnlUah = roundCents(totals.pnlUah);
  totals.incomeUah = roundCents(totals.incomeUah);
  totals.pnlPct = totals.costUsd === 0 ? 0 : (totals.pnlUsd / totals.costUsd) * 100;

  const groups: PortfolioSnapshot["groups"] = {
    crypto: [],
    stock: [],
    real_estate: [],
    bond: [],
    other: [],
  };
  for (const item of investments) groups[item.type as AssetType].push(item);

  return {
    updatedAt: now.toISOString(),
    usdUah,
    totals,
    groups,
    investments,
  };
}
