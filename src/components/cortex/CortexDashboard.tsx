"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { BalanceBar } from "@/components/cortex/BalanceBar";
import { Cortex } from "@/components/cortex/Cortex";
import { TYPE_COLORS } from "@/lib/cortex/colors";
import { formatUsd } from "@/lib/cortex/money";
import type { AssetType, PortfolioSnapshot, ValuedInvestment } from "@/lib/cortex/types";
import { TYPE_LABELS } from "@/lib/cortex/types";

function dateUk(value: string) {
  return new Date(value).toLocaleDateString("uk-UA");
}

function shortName(name: string) {
  return name.replace(/\s*[·•]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}/g, "").trim();
}

function accent(type: AssetType) {
  return type === "other" ? "#a1a1aa" : TYPE_COLORS[type];
}

const panelShell =
  "z-30 overflow-y-auto overflow-x-hidden border-white/15 bg-[#0c0a12]/96 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl " +
  "fixed inset-x-0 bottom-0 max-h-[min(78dvh,calc(100dvh-4.5rem))] rounded-t-3xl border border-b-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] " +
  "md:absolute md:inset-x-auto md:right-4 md:top-4 md:bottom-auto md:max-h-[min(70vh,calc(100dvh-8.5rem))] md:w-[min(100%-2rem,21rem)] md:rounded-2xl md:border md:pb-0";

export function CortexDashboard({ initial }: { initial: PortfolioSnapshot }) {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const res = await fetch("/api/portfolio", { cache: "no-store", credentials: "include" });
    if (!res.ok) {
      setError("Не вдалося оновити граф");
      return;
    }
    setError(null);
    setSnapshot((await res.json()) as PortfolioSnapshot);
  }, []);

  useEffect(() => {
    void load();
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const id = window.setInterval(() => void load(), mobile ? 12_000 : 5_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const selected = snapshot.investments.find((item) => item.id === selectedId);
  const groupSelected = selectedId?.startsWith("g-")
    ? (selectedId.replace("g-", "") as Exclude<AssetType, "other">)
    : null;
  const groupItems = groupSelected ? snapshot.groups[groupSelected] : [];
  const groupTotal = groupItems.reduce((sum, item) => sum + item.currentUsd, 0);
  const detailOpen = Boolean(selected || groupSelected);

  const share =
    selected && snapshot.totals.currentUsd > 0
      ? (selected.currentUsd / snapshot.totals.currentUsd) * 100
      : 0;
  const bar = selected
    ? Math.min(
        100,
        Math.max(4, (Math.abs(selected.currentUsd) / Math.max(selected.costUsd, selected.currentUsd, 1)) * 100),
      )
    : 0;

  return (
    <div className="relative h-[100dvh] overflow-hidden overscroll-none bg-[#07060b]">
      <Cortex snapshot={snapshot} selectedId={selectedId} onSelect={setSelectedId} />

      <Link
        href="/settings"
        aria-label="Назад до налаштувань"
        className="absolute bottom-[max(1.1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#0c0a12]/90 text-white backdrop-blur-xl active:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
      </Link>

      {error ? (
        <p className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[calc(env(safe-area-inset-top)+3.75rem)] z-10 max-w-[min(18rem,calc(100%-2rem))] rounded-lg border border-rose-500/20 bg-rose-950/70 px-3 py-2 text-sm text-rose-300 backdrop-blur">
          {error}
        </p>
      ) : null}

      {selected ? (
        <aside
          className={panelShell}
          style={{ boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 32px ${accent(selected.type)}22` }}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent(selected.type)}, transparent)` }} />
          <div className="relative p-4 sm:p-5">
            <button
              type="button"
              aria-label="Закрити"
              onClick={() => setSelectedId(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 active:bg-white/10 md:right-4 md:top-4"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="pr-10 text-[11px] uppercase tracking-[0.2em] text-zinc-400">{TYPE_LABELS[selected.type]}</p>
            <h2 className="mt-1 pr-10 text-lg font-semibold tracking-tight text-white sm:text-xl">
              {shortName(selected.name)}
            </h2>
            <p className="mt-1 text-xs font-medium leading-5 text-violet-200">
              {selected.livePriceUsd != null
                ? `Ціна 1 шт. ${formatUsd(selected.livePriceUsd)} — не сума позиції`
                : selected.quoteLabel}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${bar}%`,
                  background:
                    selected.pnlUsd >= 0
                      ? "linear-gradient(90deg,#4ade80,#a78bfa)"
                      : "linear-gradient(90deg,#f87171,#fb923c)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">{share.toFixed(1)}% капіталу</p>

            <DetailStats selected={selected} />

            {selected.quantity && selected.livePriceUsd != null ? (
              <p className="mt-3 text-xs leading-5 text-zinc-300">
                {selected.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })} ×{" "}
                {formatUsd(selected.livePriceUsd)} = {formatUsd(selected.quantity * selected.livePriceUsd)}
              </p>
            ) : null}
          </div>
        </aside>
      ) : groupSelected ? (
        <aside className={panelShell}>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
          <div className="relative p-4 sm:p-5">
            <button
              type="button"
              aria-label="Закрити"
              onClick={() => setSelectedId(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 active:bg-white/10"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="pr-10 text-[11px] uppercase tracking-[0.2em] text-zinc-400">Гілка</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl" style={{ color: TYPE_COLORS[groupSelected] }}>
              {TYPE_LABELS[groupSelected]}
            </h2>
            {groupItems.length ? (
              <p className="mt-1 text-xs text-zinc-400">
                з{" "}
                {dateUk(
                  groupItems.reduce(
                    (min, item) => (item.purchaseDate < min ? item.purchaseDate : min),
                    groupItems[0].purchaseDate,
                  ),
                )}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-300">
              {groupItems.length} позицій · {formatUsd(groupTotal)}
            </p>
            <ul className="mt-4 space-y-2">
              {groupItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm active:bg-white/15"
                  >
                    <span>
                      <span className="block text-white">{shortName(item.name)}</span>
                      <span className="block text-[11px] text-zinc-400">{dateUk(item.purchaseDate)}</span>
                    </span>
                    <span className={item.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {item.pnlUsd >= 0 ? "+" : ""}
                      {formatUsd(item.pnlUsd)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}

      <BalanceBar pnlUsd={snapshot.totals.pnlUsd} hidden={detailOpen} />
    </div>
  );
}

function DetailStats({ selected }: { selected: ValuedInvestment }) {
  const rows: Array<[string, string, string]> = [
    ["Дата", dateUk(selected.purchaseDate), ""],
  ];
  if (selected.quantity) {
    rows.push(["Кількість", selected.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 }), ""]);
  }
  if (selected.purchaseUnitPrice && selected.purchaseUnitCurrency === "USD") {
    rows.push(["Курс покупки", formatUsd(selected.purchaseUnitPrice), ""]);
  }
  rows.push(["Вкладено", formatUsd(selected.costUsd), ""]);
  if (selected.investedCurrency === "UAH") {
    rows.push([
      "У гривні",
      `${selected.investedAmount.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} грн`,
      "",
    ]);
  }
  rows.push(
    ["Позиція зараз", formatUsd(selected.currentUsd), ""],
    [
      "P&L",
      `${selected.pnlUsd >= 0 ? "+" : ""}${formatUsd(selected.pnlUsd)}`,
      selected.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400",
    ],
  );
  if (selected.incomeUsd > 0) rows.push(["Дохід", formatUsd(selected.incomeUsd), ""]);
  if (selected.dailyIncomeUsd > 0) {
    rows.push(
      ["За день", `+${formatUsd(selected.dailyIncomeUsd)}`, "text-emerald-400"],
      ["Сьогодні", `+${formatUsd(selected.todayIncomeUsd)}`, "text-emerald-400"],
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:gap-2.5">
      {rows.map(([label, value, klass]) => (
        <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</dt>
          <dd className={`mt-0.5 break-words font-medium text-white ${klass}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
