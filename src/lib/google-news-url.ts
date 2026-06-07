const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

const decodeCache = new Map<string, string | null>();

function isGoogleNewsArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "news.google.com" && parsed.pathname.includes("/articles/");
  } catch {
    return false;
  }
}

export async function decodeGoogleNewsUrl(sourceUrl: string): Promise<string> {
  if (!isGoogleNewsArticleUrl(sourceUrl)) return sourceUrl;
  if (decodeCache.has(sourceUrl)) return decodeCache.get(sourceUrl) ?? sourceUrl;

  try {
    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "uk-UA,uk;q=0.9" },
      redirect: "follow",
    });
    if (!res.ok) {
      decodeCache.set(sourceUrl, null);
      return sourceUrl;
    }

    const html = await res.text();
    const dataMatch = html.match(/data-p="([^"]+)"/);
    if (!dataMatch) {
      decodeCache.set(sourceUrl, null);
      return sourceUrl;
    }

    const raw = dataMatch[1].replace(/&quot;/g, '"').replace(/%.@./g, '["garturlreq",');
    const obj = JSON.parse(raw) as unknown[];
    const inner = JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]);

    const batchBody = new URLSearchParams({
      "f.req": JSON.stringify([[["Fbv4je", inner, null, "generic"]]]),
    });

    const batchRes = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": USER_AGENT,
        Referer: "https://news.google.com/",
      },
      body: batchBody.toString(),
    });

    if (!batchRes.ok) {
      decodeCache.set(sourceUrl, null);
      return sourceUrl;
    }

    const batchText = await batchRes.text();
    const cleaned = batchText.replace(/^\)\]\}'\n/, "");
    const outer = JSON.parse(cleaned) as unknown[];
    const arrayString = (outer[0] as unknown[])[2];
    if (typeof arrayString !== "string") {
      decodeCache.set(sourceUrl, null);
      return sourceUrl;
    }

    const decoded = JSON.parse(arrayString) as unknown[];
    const articleUrl = decoded[1];
    if (typeof articleUrl === "string" && articleUrl.startsWith("http")) {
      decodeCache.set(sourceUrl, articleUrl);
      return articleUrl;
    }
  } catch {
    // fall through
  }

  decodeCache.set(sourceUrl, null);
  return sourceUrl;
}
