import { inferAssetFromName, inferCategoryKind, marketKindForCategory } from "./assets-catalog";
import { snapshotAssetPurchase, type AssetSnapshot } from "./asset-prices";

type CategoryRef = { id: string; kind?: string | null; name: string };

export function marketCategoryForTransaction(
  type: "income" | "expense",
  category: CategoryRef,
  sourceCategory: CategoryRef | null
): CategoryRef | null {
  const destKind = marketKindForCategory(category.kind) ?? marketKindForCategory(inferCategoryKind(category.name));
  if (type === "income") {
    return destKind ? { ...category, kind: destKind } : null;
  }
  if (destKind) return { ...category, kind: destKind };
  if (!sourceCategory) return null;
  const sourceKind =
    marketKindForCategory(sourceCategory.kind) ?? marketKindForCategory(inferCategoryKind(sourceCategory.name));
  return sourceKind ? { ...sourceCategory, kind: sourceKind } : null;
}

export function resolveAssetForCategory(
  category: CategoryRef | null | undefined,
  explicit?: { symbol?: string; name?: string; assetClass?: string | null }
): { symbol: string; name?: string; assetClass?: string | null } | null {
  if (explicit?.symbol) {
    return { symbol: explicit.symbol, name: explicit.name, assetClass: explicit.assetClass };
  }
  if (!category) return null;
  const inferred = inferAssetFromName(category.name);
  if (!inferred) return null;
  return { symbol: inferred.symbol, name: inferred.name, assetClass: inferred.class };
}

export async function snapshotForTransaction(input: {
  type: "income" | "expense";
  amountUah: number;
  category: CategoryRef;
  sourceCategory: CategoryRef | null;
  assetSymbol?: string;
  assetName?: string;
  assetClass?: string | null;
  at?: Date;
}): Promise<{ error?: string; snapshot?: AssetSnapshot | null }> {
  const marketCategory = marketCategoryForTransaction(input.type, input.category, input.sourceCategory);
  const resolved = resolveAssetForCategory(marketCategory, {
    symbol: input.assetSymbol,
    name: input.assetName,
    assetClass: input.assetClass,
  });
  if (!resolved) return { snapshot: null };

  const snapshot = await snapshotAssetPurchase({
    symbol: resolved.symbol,
    name: resolved.name,
    assetClass: resolved.assetClass ?? marketCategory?.kind,
    amountUah: input.amountUah,
    at: input.at,
  });
  if (!snapshot) {
    return { error: "Не вдалося зафіксувати курс активу. Спробуйте ще раз." };
  }
  return { snapshot };
}

export function snapshotWriteData(snapshot: AssetSnapshot | null | undefined) {
  if (!snapshot) {
    return {
      assetSymbol: null as string | null,
      assetName: null as string | null,
      assetClass: null as string | null,
      unitPriceUsd: null as number | null,
      quantity: null as number | null,
      usdRateUah: null as number | null,
    };
  }
  return {
    assetSymbol: snapshot.assetSymbol,
    assetName: snapshot.assetName,
    assetClass: snapshot.assetClass,
    unitPriceUsd: snapshot.unitPriceUsd,
    quantity: snapshot.quantity,
    usdRateUah: snapshot.usdRateUah,
  };
}
