const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TON: "the-open-network",
  USDT: "tether",
  USDC: "usd-coin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  TRX: "tron",
  LTC: "litecoin",
  NEAR: "near",
  ATOM: "cosmos",
  UNI: "uniswap",
  SUI: "sui",
  PEPE: "pepe",
};

const GECKO_TO_TICKER = Object.fromEntries(
  Object.entries(CRYPTO_IDS).map(([ticker, id]) => [id, ticker]),
);

const BINANCE_ALIAS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  DOGE: "DOGEUSDT",
  TON: "TONUSDT",
  AVAX: "AVAXUSDT",
  DOT: "DOTUSDT",
  LINK: "LINKUSDT",
  MATIC: "MATICUSDT",
  TRX: "TRXUSDT",
  LTC: "LTCUSDT",
  NEAR: "NEARUSDT",
  ATOM: "ATOMUSDT",
  UNI: "UNIUSDT",
  SUI: "SUIUSDT",
  PEPE: "PEPEUSDT",
};

const BYBIT_SPOT: Record<string, string> = {
  NVDAX: "NVDAXUSDT",
};

const YAHOO_UNDERLYING: Record<string, string> = {
  NVDAX: "NVDA",
};
type CacheEntry<T> = { at: number; value: T };

const cache = new Map<string, CacheEntry<unknown>>();

function remember<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return factory().then((value) => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
}

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return { y, m, d, nbu: `${y}${m}${d}`, gecko: `${d}-${m}-${y}` };
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "invest-cortex/1.0",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

export function resolveCryptoId(symbolOrId: string) {
  const raw = symbolOrId.trim();
  const upper = raw.toUpperCase();
  return CRYPTO_IDS[upper] ?? raw.toLowerCase();
}

export function resolveCryptoTicker(symbolOrId: string) {
  const raw = symbolOrId.trim();
  const upper = raw.toUpperCase();
  if (CRYPTO_IDS[upper]) return upper;
  return GECKO_TO_TICKER[raw.toLowerCase()] ?? upper.replace(/[^A-Z0-9]/g, "");
}

async function nbuUahPer(code: string, date?: Date): Promise<number> {
  const stamp = date ? ymd(date).nbu : "now";
    const ttl = date ? 24 * 60 * 60 * 1000 : 30_000;
  return remember(`nbu:${code}:${stamp}`, ttl, async () => {
    const attempts = date
      ? Array.from({ length: 8 }, (_, i) => addUtcDays(date, -i))
      : [undefined];
    for (const day of attempts) {
      const query = day
        ? `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&date=${ymd(day).nbu}&json`
        : `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&json`;
      try {
        const data = await fetchJson<Array<{ rate: number }>>(query);
        const rate = data[0]?.rate;
        if (rate) return rate;
      } catch {
        continue;
      }
    }
    throw new Error(`Немає курсу НБУ ${code}${date ? ` на ${ymd(date).nbu}` : ""}`);
  });
}

export async function getUsdUah(date?: Date): Promise<number> {
  return nbuUahPer("USD", date);
}

async function toUsdFromYahoo(price: number, currency: string | undefined, date?: Date): Promise<number> {
  const code = (currency ?? "USD").trim();
  if (code === "USD" || code === "USDT") return price;
  if (code === "GBp" || code === "GBX") {
    const gbpUah = await nbuUahPer("GBP", date);
    const usdUah = await getUsdUah(date);
    return (price / 100) * (gbpUah / usdUah);
  }
  if (code === "GBP") {
    const gbpUah = await nbuUahPer("GBP", date);
    const usdUah = await getUsdUah(date);
    return price * (gbpUah / usdUah);
  }
  if (code === "EUR") {
    const eurUah = await nbuUahPer("EUR", date);
    const usdUah = await getUsdUah(date);
    return price * (eurUah / usdUah);
  }
  if (code === "UAH") {
    const usdUah = await getUsdUah(date);
    return price / usdUah;
  }
  throw new Error(`Непідтримувана валюта котирування ${code}`);
}

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; currency?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export async function getCryptoUsd(idOrSymbol: string): Promise<number> {
  const ticker = resolveCryptoTicker(idOrSymbol);
  return remember(`cg:${ticker}`, 30_000, async () => {
    try {
      return await getStockUsd(`${ticker}-USD`);
    } catch {
      const pair = BINANCE_ALIAS[ticker] ?? `${ticker}USDT`;
      const data = await fetchJson<{ price?: string }>(
        `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(pair)}`,
      );
      const price = Number(data.price);
      if (!price) throw new Error(`Немає курсу для ${ticker}`);
      return price;
    }
  });
}

export async function getCryptoUsdOn(idOrSymbol: string, date: Date): Promise<number> {
  const ticker = resolveCryptoTicker(idOrSymbol);
  const stamp = ymd(date).gecko;
  return remember(`cg-hist:${ticker}:${stamp}`, 24 * 60 * 60 * 1000, async () => {
    try {
      return await getStockUsdOn(`${ticker}-USD`, date);
    } catch {
      const pair = BINANCE_ALIAS[ticker] ?? `${ticker}USDT`;
      const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const data = await fetchJson<number[][]>(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1d&startTime=${start}&limit=1`,
      );
      const close = Number(data[0]?.[4]);
      if (!close) throw new Error(`Немає історичного курсу ${ticker} на ${stamp}`);
      return close;
    }
  });
}

export async function getStockUsd(symbol: string): Promise<number> {
  const ticker = symbol.trim().toUpperCase();
  return remember(`yh:${ticker}`, 15_000, async () => {
    const bybit = BYBIT_SPOT[ticker];
    if (bybit) {
      try {
        const data = await fetchJson<{ result?: { list?: Array<{ lastPrice?: string }> } }>(
          `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${encodeURIComponent(bybit)}`,
        );
        const last = Number(data.result?.list?.[0]?.lastPrice);
        if (last) return last;
      } catch {
        /* fall through to Yahoo */
      }
    }
    const yahoo = YAHOO_UNDERLYING[ticker] ?? ticker;
    const data = await fetchJson<YahooChart>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=5d`,
    );
    const result = data.chart?.result?.[0];
    const live = result?.meta?.regularMarketPrice;
    const closes = result?.indicators?.quote?.[0]?.close?.filter((n): n is number => n != null) ?? [];
    const raw = live ?? closes.at(-1);
    if (!raw) throw new Error(`Немає котирування ${ticker}`);
    return toUsdFromYahoo(raw, result?.meta?.currency);
  });
}

export async function getStockUsdOn(symbol: string, date: Date): Promise<number> {
  const ticker = symbol.trim().toUpperCase();
  const start = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
  const end = start + 10 * 24 * 60 * 60;
  return remember(`yh-hist:${ticker}:${start}`, 24 * 60 * 60 * 1000, async () => {
    const yahoo = YAHOO_UNDERLYING[ticker] ?? ticker;
    const data = await fetchJson<YahooChart>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&period1=${start}&period2=${end}`,
    );
    const result = data.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter((n): n is number => n != null) ?? [];
    const first = closes[0];
    if (!first) throw new Error(`Немає історичного курсу ${ticker}`);
    return toUsdFromYahoo(first, result?.meta?.currency, date);
  });
}

export async function lockPurchaseQuote(input: {
  type: string;
  symbol?: string | null;
  purchaseDate: Date;
}): Promise<{ price: number; currency: string; label: string } | null> {
  if (input.type === "crypto" && input.symbol) {
    const id = resolveCryptoId(input.symbol);
    const price = await getCryptoUsdOn(id, input.purchaseDate);
    return { price, currency: "USD", label: `${input.symbol.toUpperCase()}/USD` };
  }
  if (input.type === "stock" && input.symbol) {
    const price = await getStockUsdOn(input.symbol, input.purchaseDate);
    return { price, currency: "USD", label: `${input.symbol.toUpperCase()}/USD` };
  }
  if (input.type === "real_estate" || input.type === "bond") {
    const price = await getUsdUah(input.purchaseDate);
    return { price, currency: "UAH", label: "USD/UAH" };
  }
  return null;
}

export async function currentMarketQuote(input: {
  type: string;
  symbol?: string | null;
}): Promise<{ price: number; label: string } | null> {
  if (input.type === "crypto" && input.symbol) {
    const price = await getCryptoUsd(input.symbol);
    return { price, label: `${input.symbol.toUpperCase()} $${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` };
  }
  if (input.type === "stock" && input.symbol) {
    const price = await getStockUsd(input.symbol);
    return { price, label: `${input.symbol.toUpperCase()} $${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` };
  }
  return null;
}
