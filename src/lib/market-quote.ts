export type MarketQuote = {
  symbol: string;
  price: number;
  currency: string;
};

async function fetchBitcoinUsdFromCoinGecko(): Promise<MarketQuote | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    const price = data.bitcoin?.usd;
    if (!price || !Number.isFinite(price)) return null;
    return { symbol: "BTC-USD", price, currency: "USD" };
  } catch {
    return null;
  }
}

export async function getMarketQuote(symbolRaw: string): Promise<MarketQuote | null> {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol) return null;

  if (symbol === "BTC" || symbol === "BITCOIN") {
    return fetchBitcoinUsdFromCoinGecko();
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      if (symbol === "BTC-USD") return fetchBitcoinUsdFromCoinGecko();
      return null;
    }
    const data = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { currency?: string; regularMarketPrice?: number } }> };
    };
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const currency = meta?.currency ?? "USD";
    if (!price || !Number.isFinite(price)) return null;
    return { symbol, price, currency };
  } catch {
    if (symbol === "BTC-USD") return fetchBitcoinUsdFromCoinGecko();
    return null;
  }
}
