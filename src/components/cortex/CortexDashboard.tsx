"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { AddInvestment } from "@/components/cortex/AddInvestment";
import { BalanceBar } from "@/components/cortex/BalanceBar";
import { Cortex } from "@/components/cortex/Cortex";
import { TYPE_COLORS } from "@/lib/cortex/colors";
import { formatUsd } from "@/lib/cortex/money";
import type { AssetType, PortfolioSnapshot } from "@/lib/cortex/types";
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

export function CortexDashboard({ initial }: { initial: PortfolioSnapshot }) {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
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
    const id = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(id);
  }, [load]);

  const selected = snapshot.investments.find((item) => item.id === selectedId);
  const groupSelected = selectedId?.startsWith("g-")
    ? selectedId.replace("g-", "") as Exclude<AssetType, "other">
    : null;
  const groupItems = groupSelected ? snapshot.groups[groupSelected] : [];
  const groupTotal = groupItems.reduce((sum, item) => sum + item.currentUsd, 0);

  async function remove(id: string) {
    await fetch(`/api/investments/${id}`, { method: "DELETE", credentials: "include" });
    setSelectedId(null);
    await load();
  }

  const share = selected && snapshot.totals.currentUsd > 0 ? (selected.currentUsd / snapshot.totals.currentUsd) * 100 : 0;
  const bar = selected
    ? Math.min(100, Math.max(4, (Math.abs(selected.currentUsd) / Math.max(selected.costUsd, selected.currentUsd, 1)) * 100))
    : 0;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#07060b]">
      <Cortex snapshot={snapshot} selectedId={selectedId} onSelect={setSelectedId} />

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Додати інвестицію"
        className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0c0a12]/90 text-white backdrop-blur-xl hover:bg-white/10"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>

      <Link
        href="/settings"
        aria-label="Назад до налаштувань"
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0c0a12]/90 text-white backdrop-blur-xl hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
      </Link>

      {error ? (
        <p className="absolute left-4 top-16 z-10 rounded-lg border border-rose-500/20 bg-rose-950/70 px-3 py-2 text-sm text-rose-300 backdrop-blur">
          {error}
        </p>
      ) : null}

      {selected ? (
        <aside
          className="absolute right-4 top-4 z-10 max-h-[min(70vh,calc(100dvh-8.5rem))] w-[min(100%-2rem,21rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/15 bg-[#0c0a12]/92 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          style={{ boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 32px ${accent(selected.type)}22` }}
        >
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent(selected.type)}, transparent)` }} />
          <div className="p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{TYPE_LABELS[selected.type]}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{shortName(selected.name)}</h2>
            <p className="mt-1 text-xs font-medium text-violet-200">
              {selected.livePriceUsd != null
                ? `Ціна 1 шт. ${formatUsd(selected.livePriceUsd)} — не сума позиції`
                : selected.quoteLabel}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${bar}%`,
                  background: selected.pnlUsd >= 0 ? "linear-gradient(90deg,#4ade80,#a78bfa)" : "linear-gradient(90deg,#f87171,#fb923c)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">{share.toFixed(1)}% капіталу</p>

            <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
              {[
                ["Дата", dateUk(selected.purchaseDate), ""],
                ...(selected.quantity
                  ? [["Кількість", selected.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 }), ""]]
                  : []),
                ...(selected.purchaseUnitPrice && selected.purchaseUnitCurrency === "USD"
                  ? [["Курс покупки", formatUsd(selected.purchaseUnitPrice), ""]]
                  : []),
                ["Вкладено", formatUsd(selected.costUsd), ""],
                ...(selected.investedCurrency === "UAH"
                  ? [["У гривні", `${selected.investedAmount.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} грн`, ""]]
                  : []),
                ["Позиція зараз", formatUsd(selected.currentUsd), ""],
                ["P&L", `${selected.pnlUsd >= 0 ? "+" : ""}${formatUsd(selected.pnlUsd)}`, selected.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"],
                ...(selected.incomeUsd > 0 ? [["Дохід", formatUsd(selected.incomeUsd), ""]] : []),
                ...(selected.dailyIncomeUsd > 0
                  ? [
                      ["За день", `+${formatUsd(selected.dailyIncomeUsd)}`, "text-emerald-400"],
                      ["Сьогодні", `+${formatUsd(selected.todayIncomeUsd)}`, "text-emerald-400"],
                    ]
                  : []),
              ].map(([label, value, klass]) => (
                <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</dt>
                  <dd className={`mt-0.5 font-medium text-white ${klass}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {selected.quantity && selected.livePriceUsd != null ? (
              <p className="mt-3 text-xs leading-5 text-zinc-300">
                {selected.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })} × {formatUsd(selected.livePriceUsd)} = {formatUsd(selected.quantity * selected.livePriceUsd)}
              </p>
            ) : null}
            {selected.notes ? <p className="mt-3 text-xs leading-5 text-zinc-400">{selected.notes}</p> : null}

            {selected.type === "real_estate" ? (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Надходження оренди</p>
                {selected.receipts.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {selected.receipts.map((receipt) => (
                      <li key={receipt.id} className="flex justify-between text-sm text-zinc-200">
                        <span>{dateUk(receipt.receivedAt)}{receipt.notes ? ` · ${receipt.notes}` : ""}</span>
                        <span className="text-emerald-400">
                          +{receipt.currency === "USD" ? formatUsd(receipt.amount) : `${receipt.amount} грн`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">Ще немає записаних платежів</p>
                )}
                <form
                  className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    void (async () => {
                      await fetch(`/api/investments/${selected.id}/receipts`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          amount: Number(data.get("amount")),
                          currency: data.get("currency"),
                          receivedAt: data.get("receivedAt"),
                          notes: "Оренда",
                        }),
                      });
                      form.reset();
                      await load();
                    })();
                  }}
                >
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="136"
                    className="cortex-input px-2 py-1.5 text-sm"
                  />
                  <select name="currency" defaultValue="USD" className="cortex-input px-2 py-1.5 text-sm">
                    <option value="USD">USD</option>
                    <option value="UAH">UAH</option>
                  </select>
                  <input
                    name="receivedAt"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="cortex-input col-span-2 px-2 py-1.5 text-sm"
                  />
                  <button type="submit" className="col-span-1 rounded-md bg-[#7c5cbf] px-2 py-1.5 text-xs text-white hover:bg-[#8b6dd0]">
                    Додати
                  </button>
                </form>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void remove(selected.id)}
              className="mt-4 text-xs text-rose-400/80 transition hover:text-rose-300"
            >
              Видалити
            </button>
          </div>
        </aside>
      ) : groupSelected ? (
        <aside className="absolute right-4 top-4 z-10 max-h-[min(70vh,calc(100dvh-8.5rem))] w-[min(100%-2rem,21rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/15 bg-[#0c0a12]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Гілка</p>
          <h2 className="mt-1 text-xl font-semibold text-white" style={{ color: TYPE_COLORS[groupSelected] }}>
            {TYPE_LABELS[groupSelected]}
          </h2>
          {groupItems.length ? (
            <p className="mt-1 text-xs text-zinc-400">
              з {dateUk(groupItems.reduce((min, item) => (item.purchaseDate < min ? item.purchaseDate : min), groupItems[0].purchaseDate))}
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
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 text-left text-sm hover:bg-white/15"
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
        </aside>
      ) : null}

      <BalanceBar pnlUsd={snapshot.totals.pnlUsd} />
      <AddInvestment open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => void load()} />
    </div>
  );
}
