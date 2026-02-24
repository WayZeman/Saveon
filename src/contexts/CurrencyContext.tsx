"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Currency = "UAH" | "USD" | "EUR";

type Rates = { usd: number; eur: number };

type ContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatMoney: (amountUah: number) => string;
  rates: Rates | null;
};

const CurrencyContext = createContext<ContextValue | null>(null);

const STORAGE_KEY = "family-fin-currency";

function getStored(): Currency {
  if (typeof window === "undefined") return "UAH";
  const s = localStorage.getItem(STORAGE_KEY);
  if (s === "USD" || s === "EUR" || s === "UAH") return s;
  return "UAH";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("UAH");
  const [rates, setRates] = useState<Rates | null>(null);

  useEffect(() => {
    setCurrencyState(getStored());
  }, []);

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then(setRates)
      .catch(() => setRates({ usd: 41, eur: 45 }));
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const formatMoney = useCallback(
    (amountUah: number): string => {
      const n = Number(amountUah);
      if (!Number.isFinite(n)) return "— ₴";
      const safe = Math.max(-1e12, Math.min(1e12, n));
      if (!rates) {
        return `${safe.toLocaleString("uk-UA")} ₴`;
      }
      if (currency === "UAH") {
        return `${safe.toLocaleString("uk-UA")} ₴`;
      }
      if (currency === "USD") {
        const value = safe / rates.usd;
        return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      const value = safe / rates.eur;
      return `${value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatMoney, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
