export type CategoryTier = "primary" | "secondary";

export function isPrimaryCategory(c: { tier?: CategoryTier | string | null }): boolean {
  return (c.tier ?? "primary") === "primary";
}

export function oppositeTier(tier: CategoryTier): CategoryTier {
  return tier === "primary" ? "secondary" : "primary";
}

export function filterPrimaryCategories<T extends { tier?: CategoryTier | string | null }>(categories: T[]): T[] {
  return categories.filter(isPrimaryCategory);
}
