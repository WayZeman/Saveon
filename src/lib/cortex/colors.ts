import type { AssetType } from "@/lib/cortex/types";

export const TYPE_COLORS: Record<Exclude<AssetType, "other">, string> = {
  crypto: "#c4b5fd",
  stock: "#4ade80",
  real_estate: "#fbbf24",
  bond: "#fb923c",
};

export function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
