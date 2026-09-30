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

const USDT_PAIR: Record<string, string> = {
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
  NVDAX: "NVDAXUSDT",
};

const COINBASE_PAIR: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  BNB: "BNB-USD",
  XRP: "XRP-USD",
  ADA: "ADA-USD",
  DOGE: "DOGE-USD",
  AVAX: "AVAX-USD",
  DOT: "DOT-USD",
  LINK: "LINK-USD",
  LTC: "LTC-USD",
  NEAR: "NEAR-USD",
  ATOM: "ATOM-USD",
  UNI: "UNI-USD",
  SUI: "SUI-USD",
};

const KRAKEN_PAIR: Record<string, string> = {
  BTC: "XBTUSD",
  ETH: "ETHUSD",
  SOL: "SOLUSD",
  XRP: "XRPUSD",
  ADA: "ADAUSD",
  DOGE: "XDGUSD",
  LTC: "LTCUSD",
  LINK: "LINKUSD",
  DOT: "DOTUSD",
  AVAX: "AVAXUSD",
  UNI: "UNIUSD",
  SUI: "SUIUSD",
  TON: "TONUSD",
};

const YAHOO_UNDERLYING: Record<string, string> = {
  NVDAX: "NVDA",
  SPYX: "SPY",
  CSPX: "CSPX.L",
};

const LIVE_TTL_MS = 8_000;
const HIST_TTL_MS = 24 * 60 * 60 * 1000;
const VENUE_COOLDOWN_MS = 10 * 60 * 1000;

const venueDownUntil = new Map<string, number>();

function venueAvailable(name: string) {
  return Date.now() >= (venueDownUntil.get(name) ?? 0);
}

function markVenueDown(name: string, error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/\b(403|451|restricted|CloudFront|unavailable from a restricted)\b/i.test(text)) {
    venueDownUntil.set(name, Date.now() + VENUE_COOLDOWN_MS);
  }
}

async function tryVenue<T>(name: string, factory: () => Promise<T>): Promise<T> {
  if (!venueAvailable(name)) throw new Error(`${name} cooldown`);
  try {
    return await factory();
  } catch (error) {
    markVenueDown(name, error);
    throw error;
  }
}

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

function utcDayStartSec(date: Date) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
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

function usdtPair(ticker: string) {
  return USDT_PAIR[ticker] ?? `${ticker}USDT`;
}

export type MarketQuote = {
  price: number;
  change24hPct: number | null;
  source: string;
};

export type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; currency?: string; gmtoffset?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export function pickDailyClose(
  timestamps: number[] | undefined,
  closes: Array<number | null | undefined> | undefined,
  date: Date,
  gmtOffsetSec = 0,
): number | null {
  if (!timestamps?.length || !closes?.length) return null;
  const targetY = date.getUTCFullYear();
  const targetM = date.getUTCMonth();
  const targetD = date.getUTCDate();
  const targetSec = utcDayStartSec(date);
  let exact: number | null = null;
  let before: { ts: number; close: number } | null = null;

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close) || close <= 0) continue;
    const ts = timestamps[i];
    const local = new Date((ts + gmtOffsetSec) * 1000);
    const sameDay =
      local.getUTCFullYear() === targetY && local.getUTCMonth() === targetM && local.getUTCDate() === targetD;
    if (sameDay) exact = close;
    if (ts <= targetSec + 12 * 3600 && (!before || ts > before.ts)) {
      before = { ts, close };
    }
  }
  return exact ?? before?.close ?? null;
}

async function nbuUahPer(code: string, date?: Date): Promise<number> {
  const stamp = date ? ymd(date).nbu : "now";
  const ttl = date ? HIST_TTL_MS : 30_000;
  return remember(`nbu:${code}:${stamp}`, ttl, async () => {
    const attempts = date ? Array.from({ length: 8 }, (_, i) => addUtcDays(date, -i)) : [undefined];
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

async function firstOk<T>(factories: Array<() => Promise<T>>): Promise<T> {
  let last: unknown;
  for (const factory of factories) {
    try {
      return await factory();
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error("Немає котирування");
}

async function bybitSpotQuote(pair: string): Promise<MarketQuote> {
  const data = await fetchJson<{
    result?: { list?: Array<{ lastPrice?: string; price24hPcnt?: string; prevPrice24h?: string }> };
  }>(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${encodeURIComponent(pair)}`);
  const row = data.result?.list?.[0];
  const price = Number(row?.lastPrice);
  if (!price) throw new Error(`Немає Bybit ${pair}`);
  const pct = row?.price24hPcnt != null ? Number(row.price24hPcnt) * 100 : null;
  return { price, change24hPct: Number.isFinite(pct as number) ? pct : null, source: "Bybit" };
}

async function bybitCloseOn(pair: string, date: Date): Promise<number> {
  const start = utcDayStartSec(date) * 1000;
  const data = await fetchJson<{ result?: { list?: string[][] } }>(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=${encodeURIComponent(pair)}&interval=D&start=${start}&limit=5`,
  );
  const rows = data.result?.list ?? [];
  const target = String(start);
  for (const row of rows) {
    if (row[0] === target || Number(row[0]) === start) {
      const close = Number(row[4]);
      if (close) return close;
    }
  }
  const sorted = [...rows].sort((a, b) => Number(a[0]) - Number(b[0]));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (Number(sorted[i][0]) <= start) {
      const close = Number(sorted[i][4]);
      if (close) return close;
    }
  }
  throw new Error(`Немає Bybit kline ${pair}`);
}

async function binanceSpotQuote(pair: string): Promise<MarketQuote> {
  const data = await fetchJson<{ lastPrice?: string; priceChangePercent?: string }>(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`,
  );
  const price = Number(data.lastPrice);
  if (!price) throw new Error(`Немає Binance ${pair}`);
  const pct = data.priceChangePercent != null ? Number(data.priceChangePercent) : null;
  return { price, change24hPct: Number.isFinite(pct as number) ? pct : null, source: "Binance" };
}

async function binanceCloseOn(pair: string, date: Date): Promise<number> {
  const start = utcDayStartSec(date) * 1000;
  const data = await fetchJson<number[][]>(
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1d&startTime=${start}&limit=1`,
  );
  const close = Number(data[0]?.[4]);
  if (!close) throw new Error(`Немає Binance kline ${pair}`);
  const openTime = Number(data[0]?.[0]);
  if (openTime && openTime > start + 12 * 3600 * 1000) {
    throw new Error(`Binance kline пізніше дати ${pair}`);
  }
  return close;
}

async function coinbaseSpotQuote(pair: string): Promise<MarketQuote> {
  const data = await fetchJson<{ data?: { amount?: string } }>(
    `https://api.coinbase.com/v2/prices/${encodeURIComponent(pair)}/spot`,
  );
  const price = Number(data.data?.amount);
  if (!price) throw new Error(`Немає Coinbase ${pair}`);
  return { price, change24hPct: null, source: "Coinbase" };
}

async function coinbaseCloseOn(pair: string, date: Date): Promise<number> {
  const startIso = addUtcDays(date, -8).toISOString();
  const endIso = addUtcDays(date, 1).toISOString();
  const data = await fetchJson<number[][]>(
    `https://api.exchange.coinbase.com/products/${encodeURIComponent(pair)}/candles?granularity=86400&start=${startIso}&end=${endIso}`,
  );
  const timestamps = data.map((row) => Number(row[0]));
  const closes = data.map((row) => Number(row[4]));
  const close = pickDailyClose(timestamps, closes, date);
  if (!close) throw new Error(`Немає Coinbase candle ${pair}`);
  return close;
}

async function krakenSpotQuote(pair: string): Promise<MarketQuote> {
  const data = await fetchJson<{ result?: Record<string, { c?: string[]; o?: string }> }>(
    `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`,
  );
  const row = Object.values(data.result ?? {})[0];
  const price = Number(row?.c?.[0]);
  if (!price) throw new Error(`Немає Kraken ${pair}`);
  const open = Number(row?.o);
  const change24hPct = open ? ((price - open) / open) * 100 : null;
  return { price, change24hPct, source: "Kraken" };
}

async function geckoSpotQuote(id: string): Promise<MarketQuote> {
  const data = await fetchJson<Record<string, { usd?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
  );
  const price = data[id]?.usd;
  if (!price) throw new Error(`Немає CoinGecko ${id}`);
  return { price, change24hPct: null, source: "CoinGecko" };
}

async function geckoCloseOn(id: string, date: Date): Promise<number> {
  const stamp = ymd(date).gecko;
  const data = await fetchJson<{ market_data?: { current_price?: { usd?: number } } }>(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/history?date=${stamp}&localization=false`,
  );
  const price = data.market_data?.current_price?.usd;
  if (!price) throw new Error(`Немає CoinGecko history ${id} ${stamp}`);
  return price;
}

async function yahooLiveQuote(symbol: string): Promise<MarketQuote> {
  const yahoo = YAHOO_UNDERLYING[symbol] ?? symbol;
  const data = await fetchJson<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=5d`,
  );
  const result = data.chart?.result?.[0];
  const live = result?.meta?.regularMarketPrice;
  const closes = result?.indicators?.quote?.[0]?.close?.filter((n): n is number => n != null) ?? [];
  const raw = live ?? closes.at(-1);
  if (!raw) throw new Error(`Немає котирування ${symbol}`);
  const price = await toUsdFromYahoo(raw, result?.meta?.currency);
  const pct = result?.meta?.regularMarketChangePercent;
  return {
    price,
    change24hPct: pct != null && Number.isFinite(pct) ? pct : null,
    source: "Yahoo",
  };
}

export async function getCryptoQuote(idOrSymbol: string): Promise<MarketQuote> {
  const ticker = resolveCryptoTicker(idOrSymbol);
  return remember(`cg-live-v2:${ticker}`, LIVE_TTL_MS, () => {
    const pair = usdtPair(ticker);
    const coinbase = COINBASE_PAIR[ticker];
    const kraken = KRAKEN_PAIR[ticker];
    const gecko = CRYPTO_IDS[ticker];
    return firstOk([
      () => tryVenue("bybit", () => bybitSpotQuote(pair)),
      () => tryVenue("binance", () => binanceSpotQuote(pair)),
      () => (coinbase ? coinbaseSpotQuote(coinbase) : Promise.reject(new Error("no coinbase"))),
      () => (kraken ? krakenSpotQuote(kraken) : Promise.reject(new Error("no kraken"))),
      () => (gecko ? geckoSpotQuote(gecko) : Promise.reject(new Error("no gecko"))),
      () => yahooLiveQuote(`${ticker}-USD`),
    ]);
  });
}

export async function getCryptoUsd(idOrSymbol: string): Promise<number> {
  return (await getCryptoQuote(idOrSymbol)).price;
}

export async function getCryptoUsdOn(idOrSymbol: string, date: Date): Promise<number> {
  const ticker = resolveCryptoTicker(idOrSymbol);
  const stamp = ymd(date).gecko;
  return remember(`cg-hist-v2:${ticker}:${stamp}`, HIST_TTL_MS, () => {
    const pair = usdtPair(ticker);
    const coinbase = COINBASE_PAIR[ticker];
    const gecko = CRYPTO_IDS[ticker];
    return firstOk([
      () => tryVenue("bybit", () => bybitCloseOn(pair, date)),
      () => tryVenue("binance", () => binanceCloseOn(pair, date)),
      () => (coinbase ? coinbaseCloseOn(coinbase, date) : Promise.reject(new Error("no coinbase hist"))),
      () => (gecko ? geckoCloseOn(gecko, date) : Promise.reject(new Error("no gecko hist"))),
      () => getStockUsdOn(`${ticker}-USD`, date),
    ]);
  });
}

export async function getStockUsd(symbol: string): Promise<number> {
  return (await getStockQuote(symbol)).price;
}

export async function getStockQuote(symbol: string): Promise<MarketQuote> {
  const ticker = symbol.trim().toUpperCase();
  return remember(`yh:${ticker}`, LIVE_TTL_MS, () => {
    const bybit = USDT_PAIR[ticker];
    return firstOk([
      () =>
        bybit && ticker === "NVDAX"
          ? tryVenue("bybit", () => bybitSpotQuote(bybit))
          : Promise.reject(new Error("skip bybit")),
      () => yahooLiveQuote(ticker),
    ]);
  });
}

export async function getStockUsdOn(symbol: string, date: Date): Promise<number> {
  const ticker = symbol.trim().toUpperCase();
  const day = utcDayStartSec(date);
  return remember(`yh-hist-v2:${ticker}:${day}`, HIST_TTL_MS, async () => {
    const start = day - 12 * 24 * 60 * 60;
    const end = day + 2 * 24 * 60 * 60;
    const yahoo = YAHOO_UNDERLYING[ticker] ?? ticker;
    const data = await fetchJson<YahooChart>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&period1=${start}&period2=${end}`,
    );
    const result = data.chart?.result?.[0];
    const close = pickDailyClose(
      result?.timestamp,
      result?.indicators?.quote?.[0]?.close,
      date,
      result?.meta?.gmtoffset ?? 0,
    );
    if (!close) throw new Error(`Немає історичного курсу ${ticker}`);
    return toUsdFromYahoo(close, result?.meta?.currency, date);
  });
}

export async function lockPurchaseQuote(input: {
  type: string;
  symbol?: string | null;
  purchaseDate: Date;
}): Promise<{ price: number; currency: string; label: string } | null> {
  if (input.type === "crypto" && input.symbol) {
    const price = await getCryptoUsdOn(input.symbol, input.purchaseDate);
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
}): Promise<{ price: number; label: string; change24hPct: number | null; source: string } | null> {
  if (input.type === "crypto" && input.symbol) {
    const quote = await getCryptoQuote(input.symbol);
    const digits = quote.price >= 1 ? 2 : 6;
    return {
      price: quote.price,
      change24hPct: quote.change24hPct,
      source: quote.source,
      label: `${input.symbol.toUpperCase()} $${quote.price.toLocaleString("en-US", { maximumFractionDigits: digits })} · ${quote.source}`,
    };
  }
  if (input.type === "stock" && input.symbol) {
    const quote = await getStockQuote(input.symbol);
    return {
      price: quote.price,
      change24hPct: quote.change24hPct,
      source: quote.source,
      label: `${input.symbol.toUpperCase()} $${quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })} · ${quote.source}`,
    };
  }
  return null;
}
