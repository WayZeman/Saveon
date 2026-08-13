import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { marketKindForCategory, searchCatalog } from "@/lib/assets-catalog";
import { catalogAssetFromUnknown, searchYahooAssets } from "@/lib/asset-prices";

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;

  const { searchParams } = new URL(request.url);
  const kind = marketKindForCategory(searchParams.get("class") ?? searchParams.get("kind"));
  const query = (searchParams.get("q") ?? "").trim();
  if (!kind) {
    return NextResponse.json({ error: "class must be stock or crypto" }, { status: 400 });
  }

  const catalog = searchCatalog(query, kind, 20).map((a) => ({
    symbol: a.symbol,
    name: a.name,
    class: a.class,
  }));

  if (!query) return NextResponse.json({ assets: catalog });

  const remote = kind === "crypto" || kind === "stock" ? await searchYahooAssets(query, kind) : [];
  const seen = new Set(catalog.map((a) => a.symbol.toUpperCase()));
  const merged = [...catalog];
  for (const hit of remote) {
    const asset = catalogAssetFromUnknown(hit.symbol, hit.name, hit.class);
    if (seen.has(asset.symbol)) continue;
    seen.add(asset.symbol);
    merged.push({ symbol: asset.symbol, name: asset.name, class: asset.class });
  }
  return NextResponse.json({ assets: merged.slice(0, 24) });
}
