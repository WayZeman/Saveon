import type { AssetClass, CatalogAsset } from "./assets-catalog";
import { getCatalogAsset, yahooSymbolFor } from "./assets-catalog";
import { getExchangeRates } from "./exchange-rates";

const YAHOO_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
};

type PriceCache = { price: number; expires: number };
const currentCache = new Map<string, PriceCache>();
const historicalCache = new Map<string, number>();
const usdRateCache = new Map<string, number>();

const CURRENT_TTL_MS = 5 * 60 * 1000;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function yahooSymbol(symbol: string, assetClass?: string | null): string {
  const catalog = getCatalogAsset(symbol);
  if (catalog) return yahooSymbolFor(catalog);
  if (assetClass === "crypto" && !symbol.includes("-")) return `${symbol.toUpperCase()}-USD`;
  return symbol.toUpperCase();
}

async function fetchYahooChart(symbol: string, params: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  if (!result) return null;
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  for (let i = closes.length - 1; i >= 0; i--) {
    const value = closes[i];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return round4(value);
  }
  const live = result.meta?.regularMarketPrice;
  if (typeof live === "number" && Number.isFinite(live) && live > 0) return round4(live);
  return null;
}

export async function getCurrentPriceUsd(symbol: string, assetClass?: string | null): Promise<number | null> {
  const ySymbol = yahooSymbol(symbol, assetClass);
  const cached = currentCache.get(ySymbol);
  if (cached && cached.expires > Date.now()) return cached.price;
  const price = await fetchYahooChart(ySymbol, "interval=1d&range=1d");
  if (price == null) return null;
  currentCache.set(ySymbol, { price, expires: Date.now() + CURRENT_TTL_MS });
  return price;
}

export async function getHistoricalPriceUsd(
  symbol: string,
  at: Date,
  assetClass?: string | null
): Promise<number | null> {
  const ySymbol = yahooSymbol(symbol, assetClass);
  const key = `${ySymbol}|${dayKey(at)}`;
  if (historicalCache.has(key)) return historicalCache.get(key) ?? null;

  const start = Math.floor(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) / 1000);
  const end = start + 3 * 24 * 60 * 60;
  const price = await fetchYahooChart(ySymbol, `period1=${start}&period2=${end}&interval=1d`);
  if (price == null) return getCurrentPriceUsd(symbol, assetClass);
  historicalCache.set(key, price);
  return price;
}

export async function getCurrentPricesUsd(
  items: Array<{ symbol: string; assetClass?: string | null }>
): Promise<Record<string, number>> {
  const unique = new Map<string, string | null | undefined>();
  for (const item of items) unique.set(item.symbol.toUpperCase(), item.assetClass);
  const entries = await Promise.all(
    Array.from(unique.entries()).map(async ([symbol, assetClass]) => {
      const price = await getCurrentPriceUsd(symbol, assetClass);
      return [symbol, price] as const;
    })
  );
  const result: Record<string, number> = {};
  for (const [symbol, price] of entries) {
    if (price != null) result[symbol] = price;
  }
  return result;
}

export async function getUsdUahRate(at?: Date): Promise<number> {
  if (!at) {
    const live = await getExchangeRates();
    return live.usd;
  }
  const key = dayKey(at);
  if (usdRateCache.has(key)) return usdRateCache.get(key)!;
  const yyyymmdd = key.replace(/-/g, "");
  try {
    const res = await fetch(
      `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${yyyymmdd}&json`,
      { cache: "force-cache", next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const data = (await res.json()) as { cc?: string; rate?: number }[];
      const rate = data.find((x) => x.cc === "USD")?.rate;
      if (typeof rate === "number" && rate > 0) {
        usdRateCache.set(key, rate);
        return rate;
      }
    }
  } catch {
    /* fall through */
  }
  const live = await getExchangeRates();
  return live.usd;
}

export type AssetSnapshot = {
  assetSymbol: string;
  assetName: string;
  assetClass: AssetClass;
  unitPriceUsd: number;
  usdRateUah: number;
  quantity: number;
};

export async function snapshotAssetPurchase(input: {
  symbol: string;
  name?: string;
  assetClass?: string | null;
  amountUah: number;
  at?: Date;
}): Promise<AssetSnapshot | null> {
  const catalog = getCatalogAsset(input.symbol);
  const assetClass = (catalog?.class ?? input.assetClass ?? "stock") as AssetClass;
  const assetName = catalog?.name ?? input.name ?? input.symbol.toUpperCase();
  const symbol = (catalog?.symbol ?? input.symbol).toUpperCase();
  const unitPriceUsd = input.at
    ? await getHistoricalPriceUsd(symbol, input.at, assetClass)
    : await getCurrentPriceUsd(symbol, assetClass);
  if (unitPriceUsd == null || unitPriceUsd <= 0) return null;
  const usdRateUah = await getUsdUahRate(input.at);
  if (usdRateUah <= 0) return null;
  const quantity = input.amountUah / usdRateUah / unitPriceUsd;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return {
    assetSymbol: symbol,
    assetName,
    assetClass,
    unitPriceUsd,
    usdRateUah,
    quantity: Math.round(quantity * 1e8) / 1e8,
  };
}

export type YahooSearchHit = {
  symbol: string;
  name: string;
  class: AssetClass;
};

export async function searchYahooAssets(query: string, kind: "stock" | "crypto"): Promise<YahooSearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string }>;
  };
  const hits: YahooSearchHit[] = [];
  for (const quote of json.quotes ?? []) {
    const raw = quote.symbol?.trim();
    if (!raw) continue;
    const quoteType = (quote.quoteType ?? "").toUpperCase();
    if (kind === "crypto") {
      if (quoteType !== "CRYPTOCURRENCY") continue;
      if (!raw.endsWith("-USD")) continue;
      hits.push({
        symbol: raw.slice(0, -4),
        name: quote.shortname?.replace(/\s+USD$/i, "") || raw.slice(0, -4),
        class: "crypto",
      });
    } else {
      if (quoteType !== "EQUITY" && quoteType !== "ETF") continue;
      if (raw.includes("=")) continue;
      hits.push({
        symbol: raw,
        name: quote.shortname || quote.longname || raw,
        class: quoteType === "ETF" ? "etf" : "stock",
      });
    }
    if (hits.length >= 12) break;
  }
  return hits;
}

export function catalogAssetFromUnknown(symbol: string, name: string, assetClass: string): CatalogAsset {
  const catalog = getCatalogAsset(symbol);
  if (catalog) return catalog;
  const cls: AssetClass = assetClass === "crypto" || assetClass === "etf" ? assetClass : "stock";
  return { symbol: symbol.toUpperCase(), name, class: cls, aliases: [symbol.toLowerCase()] };
}
