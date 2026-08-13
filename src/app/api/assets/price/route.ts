import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { getCatalogAsset } from "@/lib/assets-catalog";
import { getCurrentPriceUsd } from "@/lib/asset-prices";

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "").trim();
  const assetClass = searchParams.get("class");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const catalog = getCatalogAsset(symbol);
  const price = await getCurrentPriceUsd(symbol, catalog?.class ?? assetClass);
  if (price == null) return NextResponse.json({ error: "price unavailable" }, { status: 502 });
  return NextResponse.json({
    symbol: catalog?.symbol ?? symbol.toUpperCase(),
    name: catalog?.name ?? symbol.toUpperCase(),
    class: catalog?.class ?? assetClass,
    priceUsd: price,
  });
}
