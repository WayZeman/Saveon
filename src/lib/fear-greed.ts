export type FearGreedData = {
  value: number;
  classification: string;
  updatedAt: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { data: FearGreedData; fetchedAt: number } | null = null;

export async function getFearGreedIndex(): Promise<{ data: FearGreedData; cached: boolean }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, cached: true };
  }

  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error("Fear & Greed API failed");

  const json = (await res.json()) as {
    data?: Array<{ value?: string; value_classification?: string; timestamp?: string }>;
  };

  const row = json.data?.[0];
  const value = Number(row?.value);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid Fear & Greed value");
  }

  const data: FearGreedData = {
    value: Math.round(value),
    classification: row?.value_classification?.trim() || "Neutral",
    updatedAt: row?.timestamp
      ? new Date(Number(row.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  };

  cache = { data, fetchedAt: now };
  return { data, cached: false };
}
