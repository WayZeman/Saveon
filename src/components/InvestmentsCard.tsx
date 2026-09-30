"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatPnlPercent, type AssetHolding, type InvestmentGroup } from "@/lib/holdings";

const COLORS = ["#f7931a", "#0a84ff", "#30d158", "#bf5af2", "#ff9f0a", "#ff453a"];

type Props = {
  groups: InvestmentGroup[];
  pie: { name: string; value: number; chartValue: number }[];
  formatMoney: (n: number) => string;
  t: (key: string) => string;
};

export function InvestmentsCard({ groups, pie, formatMoney, t }: Props) {
  const crypto = groups.find((g) => g.key === "crypto");
  const stocks = groups.find((g) => g.key === "stock");
  const hasHoldings = groups.some((g) => g.holdings.length > 0);

  return (
    <section className="card opacity-0 animate-slide-up animate-stagger-2">
      <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-[18px] h-[18px] text-[var(--accent-green)]" strokeWidth={2} />
        {t("home_investments")}
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">{t("home_investmentsHint")}</p>

      {!hasHoldings ? (
        <div className="py-10 text-center text-[var(--text-tertiary)] text-[14px]">{t("home_investmentsEmpty")}</div>
      ) : (
        <>
          {pie.length > 0 && (
            <div className="h-52 md:h-60 categories-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <Pie
                    data={pie}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={74}
                    paddingAngle={2}
                    minAngle={8}
                    dataKey="chartValue"
                    nameKey="name"
                    stroke="var(--bg)"
                    strokeWidth={1}
                    labelLine={{ stroke: "var(--text-tertiary)", strokeWidth: 1 }}
                    label={({ percent, name }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    isAnimationActive={false}
                  >
                    {pie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [formatMoney(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-5 space-y-5">
            <GroupBlock title={t("home_investmentsCrypto")} group={crypto} formatMoney={formatMoney} t={t} />
            <GroupBlock title={t("home_investmentsStocks")} group={stocks} formatMoney={formatMoney} t={t} />
          </div>
        </>
      )}
    </section>
  );
}

function GroupBlock({
  title,
  group,
  formatMoney,
  t,
}: {
  title: string;
  group: InvestmentGroup | undefined;
  formatMoney: (n: number) => string;
  t: (key: string) => string;
}) {
  if (!group || group.holdings.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{title}</h3>
        {group.pnlPercent != null && (
          <span className={`text-[13px] font-semibold tabular-nums ${group.pnlPercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
            {formatPnlPercent(group.pnlPercent)}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {group.holdings.map((h) => (
          <HoldingRow key={`${h.categoryId}-${h.symbol}`} holding={h} formatMoney={formatMoney} t={t} />
        ))}
      </ul>
    </div>
  );
}

function HoldingRow({
  holding,
  formatMoney,
  t,
}: {
  holding: AssetHolding;
  formatMoney: (n: number) => string;
  t: (key: string) => string;
}) {
  return (
    <li className="rounded-xl bg-[var(--input-bg)] border border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium truncate">{holding.symbol}</p>
          <p className="text-[12px] text-[var(--text-tertiary)] truncate mt-0.5">
            {holding.name}
            {holding.avgPriceUsd > 0 ? ` · ${t("home_investmentsLocked")} $${holding.avgPriceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}
          </p>
        </div>
        {holding.pnlPercent != null && (
          <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${holding.pnlPercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
            {formatPnlPercent(holding.pnlPercent)}
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-4 text-[12px] text-[var(--text-secondary)]">
        <span>{t("home_invested")} {formatMoney(holding.investedUah)}</span>
        <span>{t("home_currentValue")} {formatMoney(holding.currentValueUah)}</span>
      </div>
    </li>
  );
}
