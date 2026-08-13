import { inferCategoryKind, marketKindForCategory } from "./assets-catalog";
import { snapshotAssetPurchase, type AssetSnapshot } from "./asset-prices";

type CategoryRef = { id: string; kind: string; name: string };

export function marketCategoryForTransaction(
  type: "income" | "expense",
  category: CategoryRef,
  sourceCategory: CategoryRef | null
): CategoryRef | null {
  const target = type === "expense" ? sourceCategory ?? category : category;
  const kind = marketKindForCategory(target.kind) ?? marketKindForCategory(inferCategoryKind(target.name));
  return kind ? { ...target, kind } : null;
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
  if (!input.assetSymbol) {
    if (marketCategory) return { error: "Оберіть актив зі списку" };
    return { snapshot: null };
  }
  const snapshot = await snapshotAssetPurchase({
    symbol: input.assetSymbol,
    name: input.assetName,
    assetClass: input.assetClass ?? marketCategory?.kind,
    amountUah: input.amountUah,
    at: input.at,
  });
  if (!snapshot) {
    return { error: "Не вдалося зафіксувати курс активу. Спробуйте ще раз." };
  }
  return { snapshot };
}
