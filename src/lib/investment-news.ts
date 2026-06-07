export type NewsCategory = "stocks" | "crypto";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
  category: NewsCategory;
};

const USER_AGENT = "Mozilla/5.0 (compatible; Saveon/1.0; +https://github.com/WayZeman/Saveon)";
const NEWS_LIMIT = 20;
const CACHE_TTL_MS = 30 * 60 * 1000;
const IMAGE_FETCH_TIMEOUT_MS = 4500;

const FEEDS = [
  // Акції та фондовий ринок
  "https://news.google.com/rss/search?q=%D0%B0%D0%BA%D1%86%D1%96%D1%97+%D1%84%D0%BE%D0%BD%D0%B4%D0%BE%D0%B2%D0%B8%D0%B9+%D1%80%D0%B8%D0%BD%D0%BE%D0%BA&hl=uk&gl=UA&ceid=UA:uk",
  "https://news.google.com/rss/search?q=%D0%B0%D0%BA%D1%86%D1%96%D1%97+%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D0%B0&hl=uk&gl=UA&ceid=UA:uk",
  "https://news.google.com/rss/search?q=%D1%84%D0%BE%D0%BD%D0%B4%D0%BE%D0%B2%D0%B8%D0%B9+%D1%80%D0%B8%D0%BD%D0%BE%D0%BA+%D0%B1%D1%96%D1%80%D0%B6%D0%B0&hl=uk&gl=UA&ceid=UA:uk",
  // Криптовалюта
  "https://news.google.com/rss/search?q=%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D0%B0&hl=uk&gl=UA&ceid=UA:uk",
  "https://news.google.com/rss/search?q=bitcoin+%D0%B1%D1%96%D1%82%D0%BA%D0%BE%D1%97%D0%BD&hl=uk&gl=UA&ceid=UA:uk",
  "https://news.google.com/rss/search?q=%D0%B5%D1%82%D0%B5%D1%80%D0%B5%D1%83%D0%BC+%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE&hl=uk&gl=UA&ceid=UA:uk",
];

const STOCK_KEYWORDS = [
  "акці", "фондов", "бірж", "індекс", "s&p", "nasdaq", "dow", "etf", "дивіденд",
  "капіталізац", "ipo", "tesla", "apple", "nvidia", "microsoft", "google",
];
const CRYPTO_KEYWORDS = [
  "крипт", "біткоїн", "bitcoin", "btc", "ethereum", "етер", "eth", "блокчейн",
  "altcoin", "стейблкоїн", "defi", "nft", "солана", "solana", "binance",
];
const EXCLUDE_PATTERNS = [
  /курс\s+.+\s+на\s+сьогодні/i,
  /курс\s+.+\s+до\s+(долар|євро|гривн)/i,
  /ціна\s+.+\s+на\s+сьогодні/i,
];

type RawNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  summary: string;
};

let newsCache: { items: NewsItem[]; fetchedAt: number } | null = null;
const imageCache = new Map<string, string | null>();

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeXml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function cleanTitle(title: string, source: string): string {
  const decoded = decodeXml(title).trim();
  const suffix = ` - ${source}`;
  if (source && decoded.endsWith(suffix)) return decoded.slice(0, -suffix.length).trim();
  const dashIdx = decoded.lastIndexOf(" - ");
  if (dashIdx > 20) return decoded.slice(0, dashIdx).trim();
  return decoded;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

function isRelevantFinanceNews(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  if (EXCLUDE_PATTERNS.some((re) => re.test(text))) return false;
  const isStock = STOCK_KEYWORDS.some((kw) => text.includes(kw));
  const isCrypto = CRYPTO_KEYWORDS.some((kw) => text.includes(kw));
  return isStock || isCrypto;
}

export function getNewsCategory(title: string, summary: string): NewsCategory {
  const text = `${title} ${summary}`.toLowerCase();
  const isCrypto = CRYPTO_KEYWORDS.some((kw) => text.includes(kw));
  const isStock = STOCK_KEYWORDS.some((kw) => text.includes(kw));
  if (isCrypto && !isStock) return "crypto";
  return "stocks";
}

function itemId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) | 0;
  return `news-${Math.abs(hash).toString(36)}`;
}

function parseRssItems(xml: string): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = block.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1];
    if (!title || !link) continue;

    const source =
      block.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i)?.[1]?.trim() ?? "";
    const pubDateRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    const description = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? "";

    const publishedAt = pubDateRaw ? new Date(pubDateRaw) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;

    const cleanedTitle = cleanTitle(title, source);
    if (!hasCyrillic(cleanedTitle)) continue;

    let summary = stripHtml(description);
    if (!summary || summary === cleanedTitle || summary.length < 20) {
      summary = cleanedTitle;
    }
    if (!isRelevantFinanceNews(cleanedTitle, summary)) continue;

    summary = truncate(summary, 160);

    items.push({
      title: cleanedTitle,
      url: decodeXml(link).trim(),
      source: decodeXml(source).trim() || "Джерело",
      publishedAt,
      summary,
    });
  }

  return items;
}

async function fetchFeed(url: string): Promise<RawNewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml);
}

async function fetchOgImage(url: string): Promise<string | null> {
  if (imageCache.has(url)) return imageCache.get(url) ?? null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      imageCache.set(url, null);
      return null;
    }
    const html = (await res.text()).slice(0, 120_000);
    const match =
      html.match(/property=["']og:image(?::[^"']*)?["']\s+content=["']([^"']+)["']/i) ??
      html.match(/content=["']([^"']+)["']\s+property=["']og:image(?::[^"']*)?["']/i) ??
      html.match(/name=["']twitter:image(?::[^"']*)?["']\s+content=["']([^"']+)["']/i);
    const imageUrl = match?.[1]?.trim() ?? null;
    imageCache.set(url, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(url, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichImages(items: RawNewsItem[]): Promise<NewsItem[]> {
  const batchSize = 5;
  const result: NewsItem[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const images = await Promise.all(batch.map((item) => fetchOgImage(item.url)));
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      result.push({
        id: itemId(item.url),
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt.toISOString(),
        imageUrl: images[j],
        category: getNewsCategory(item.title, item.summary),
      });
    }
  }

  return result;
}

function dedupeAndSort(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  const unique: RawNewsItem[] = [];

  for (const item of items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())) {
    const key = item.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= NEWS_LIMIT) break;
  }

  return unique;
}

function toNewsItems(items: RawNewsItem[]): NewsItem[] {
  return items.map((item) => ({
    id: itemId(item.url),
    title: item.title,
    summary: item.summary,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt.toISOString(),
    imageUrl: null,
    category: getNewsCategory(item.title, item.summary),
  }));
}

async function loadNews(): Promise<NewsItem[]> {
  const feedResults = await Promise.allSettled(FEEDS.map((url) => fetchFeed(url)));
  const merged: RawNewsItem[] = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }

  const top = dedupeAndSort(merged);
  const items = toNewsItems(top);

  // Зображення підвантажуємо у фоні — не блокуємо відповідь API (важливо для serverless).
  void enrichImages(top).then((withImages) => {
    if (newsCache) {
      newsCache = { items: withImages, fetchedAt: newsCache.fetchedAt };
    }
  });

  return items;
}

export async function getInvestmentNews(): Promise<{ items: NewsItem[]; cached: boolean; updatedAt: string }> {
  const now = Date.now();
  if (newsCache && now - newsCache.fetchedAt < CACHE_TTL_MS) {
    return {
      items: newsCache.items,
      cached: true,
      updatedAt: new Date(newsCache.fetchedAt).toISOString(),
    };
  }

  const items = await loadNews();
  newsCache = { items, fetchedAt: now };
  return { items, cached: false, updatedAt: new Date(now).toISOString() };
}
