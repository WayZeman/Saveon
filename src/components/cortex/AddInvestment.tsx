"use client";

import { useMemo, useState } from "react";
import type { AssetType } from "@/lib/cortex/types";
import { TYPE_LABELS } from "@/lib/cortex/types";

const today = () => new Date().toISOString().slice(0, 10);

export function AddInvestment({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<AssetType>("crypto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => {
    if (type === "crypto") {
      return { symbol: "BTC", symbolLabel: "Тікер / CoinGecko id", hint: "На дату покупки фіксується курс BTC і кількість монет." };
    }
    if (type === "stock") {
      return { symbol: "AAPL", symbolLabel: "Тікер Yahoo", hint: "Курс акції на дату покупки береться з Yahoo Finance." };
    }
    if (type === "real_estate") {
      return { symbol: "", symbolLabel: "Не потрібно", hint: "Оренда в гривні щодня перераховується в долар по курсу НБУ." };
    }
    if (type === "bond") {
      return { symbol: "", symbolLabel: "Не потрібно", hint: "Купон у гривні нараховується щодня і переводиться в долар по курсу НБУ." };
    }
    return { symbol: "", symbolLabel: "Опційно", hint: "Вартість лишається як внесена, без ринкового курсу." };
  }, [type]);

  if (!open) return null;

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      type,
      symbol: String(formData.get("symbol") ?? "") || undefined,
      investedAmount: Number(formData.get("investedAmount")),
      investedCurrency: String(formData.get("investedCurrency") ?? "USD"),
      purchaseDate: String(formData.get("purchaseDate") ?? today()),
      quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
      monthlyIncome: formData.get("monthlyIncome") ? Number(formData.get("monthlyIncome")) : undefined,
      monthlyIncomeCurrency: String(formData.get("monthlyIncomeCurrency") ?? "UAH"),
      estimatedValue: formData.get("estimatedValue") ? Number(formData.get("estimatedValue")) : undefined,
      estimatedValueCurrency: String(formData.get("estimatedValueCurrency") ?? "USD"),
      annualRate: formData.get("annualRate") ? Number(formData.get("annualRate")) : undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    };
    const res = await fetch("/api/portfolio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Не вдалося зберегти");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-[2px]">
      <button className="flex-1" aria-label="Закрити" onClick={onClose} />
      <form
        key={type}
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#262626] p-6 text-[#ece8f5]"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div>
          <p className="text-[11px] tracking-[0.22em] text-[#a88bfa]">НОВА НОТАТКА ГРАФА</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Додати інвестицію</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_LABELS) as AssetType[])
            .filter((key) => key !== "other")
            .map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`rounded-md border px-3 py-2 text-sm ${
                type === key
                  ? "border-[#a88bfa] bg-[#a88bfa]/10 text-white"
                  : "border-white/10 text-[#8a8a8a]"
              }`}
            >
              {TYPE_LABELS[key]}
            </button>
          ))}
        </div>

        <label className="grid gap-1 text-sm">
          Назва
          <input name="name" required placeholder="Bitcoin, квартира на Подолі..." className="cortex-input" />
        </label>

        {type !== "real_estate" && type !== "other" && type !== "bond" ? (
          <label className="grid gap-1 text-sm">
            {fields.symbolLabel}
            <input name="symbol" defaultValue={fields.symbol} className="cortex-input" />
          </label>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="grid gap-1 text-sm">
            Скільки вклав
            <input name="investedAmount" type="number" step="0.01" required placeholder="12000" className="cortex-input" />
          </label>
          <label className="grid gap-1 text-sm">
            Валюта
            <select name="investedCurrency" defaultValue={type === "bond" ? "UAH" : "USD"} className="cortex-input">
              <option>USD</option>
              <option>UAH</option>
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          Дата покупки
          <input name="purchaseDate" type="date" required defaultValue={today()} className="cortex-input" />
        </label>

        {(type === "crypto" || type === "stock") && (
          <label className="grid gap-1 text-sm">
            Кількість (опційно)
            <input name="quantity" type="number" step="any" placeholder="порахується з курсу на дату" className="cortex-input" />
          </label>
        )}

        {type === "bond" && (
          <label className="grid gap-1 text-sm">
            Ставка, % річних
            <input name="annualRate" type="number" step="0.01" required placeholder="15.2" className="cortex-input" />
          </label>
        )}

        {type === "real_estate" && (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="grid gap-1 text-sm">
                Оренда на місяць
                <input name="monthlyIncome" type="number" step="0.01" placeholder="6000" className="cortex-input" />
              </label>
              <label className="grid gap-1 text-sm">
                Валюта
                <select name="monthlyIncomeCurrency" defaultValue="UAH" className="cortex-input">
                  <option>UAH</option>
                  <option>USD</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="grid gap-1 text-sm">
                Поточна оцінка (опційно)
                <input name="estimatedValue" type="number" step="0.01" className="cortex-input" />
              </label>
              <label className="grid gap-1 text-sm">
                Валюта
                <select name="estimatedValueCurrency" defaultValue="USD" className="cortex-input">
                  <option>USD</option>
                  <option>UAH</option>
                </select>
              </label>
            </div>
          </>
        )}

        <label className="grid gap-1 text-sm">
          Нотатка
          <textarea name="notes" rows={2} className="cortex-input resize-none" />
        </label>

        <p className="text-xs leading-5 text-zinc-400">{fields.hint}</p>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-auto rounded-md bg-[#7c5cbf] px-4 py-2.5 text-sm text-white hover:bg-[#8b6dd0] disabled:opacity-60"
        >
          {busy ? "Фіксую курс..." : "Додати у граф"}
        </button>
      </form>
    </div>
  );
}
