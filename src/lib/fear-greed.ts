export type FearGreedMarket = "stocks" | "crypto";

export type FearGreedItem = {
  market: FearGreedMarket;
  value: number;
  classification: string;
  updatedAt: string;
};

export type FearGreedData = {
  stocks: FearGreedItem | null;
  crypto: FearGreedItem | null;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const CNN_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  Origin: "https://www.cnn.com",
  Referer: "https://www.cnn.com/markets/fear-and-greed",
};

let cache: { data: FearGreedData; fetchedAt: number } | null = null;

function normalizeClassification(raw: string): string {
  const text = raw.trim().toLowerCase();
  if (text.includes("extreme") && text.includes("fear")) return "Extreme Fear";
  if (text.includes("extreme") && text.includes("greed")) return "Extreme Greed";
  if (text.includes("fear")) return "Fear";
  if (text.includes("greed")) return "Greed";
  return "Neutral";
}

async function fetchCryptoFearGreed(): Promise<FearGreedItem> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Crypto Fear & Greed API failed");

  const json = (await res.json()) as {
    data?: Array<{ value?: string; value_classification?: string; timestamp?: string }>;
  };
  const row = json.data?.[0];
  const value = Number(row?.value);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid crypto Fear & Greed value");
  }

  return {
    market: "crypto",
    value: Math.round(value),
    classification: normalizeClassification(row?.value_classification || "Neutral"),
    updatedAt: row?.timestamp
      ? new Date(Number(row.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  };
}

async function fetchStocksFearGreed(): Promise<FearGreedItem> {
  const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
    headers: CNN_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Stocks Fear & Greed API failed");

  const json = (await res.json()) as {
    fear_and_greed?: { score?: number; rating?: string; timestamp?: string };
  };
  const row = json.fear_and_greed;
  const value = Number(row?.score);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid stocks Fear & Greed value");
  }

  return {
    market: "stocks",
    value: Math.round(value),
    classification: normalizeClassification(row?.rating || "Neutral"),
    updatedAt: row?.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
  };
}

export async function getFearGreedIndex(): Promise<{ data: FearGreedData; cached: boolean }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, cached: true };
  }

  const [stocksResult, cryptoResult] = await Promise.allSettled([
    fetchStocksFearGreed(),
    fetchCryptoFearGreed(),
  ]);

  const data: FearGreedData = {
    stocks: stocksResult.status === "fulfilled" ? stocksResult.value : null,
    crypto: cryptoResult.status === "fulfilled" ? cryptoResult.value : null,
  };

  if (!data.stocks && !data.crypto) {
    throw new Error("Fear & Greed APIs failed");
  }

  cache = { data, fetchedAt: now };
  return { data, cached: false };
}
