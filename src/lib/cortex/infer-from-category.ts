import type { AssetType } from "./types";

export type InferredLot = {
  type: Exclude<AssetType, "other">;
  symbol: string | null;
  name: string;
};

function fold(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ї/g, "і")
    .replace(/ґ/g, "г")
    .replace(/[''`´]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

const IGNORE_EXACT = new Set([
  "готівка",
  "готівки",
  "cash",
  "картка",
  "карта",
  "банк",
  "депозит",
  "їжа",
  "food",
  "зарплата",
  "комуналка",
  "транспорт",
  "розваги",
  "інше",
  "other",
  "крипта",
  "crypto",
  "акції",
  "акции",
  "stocks",
  "stock",
]);

type Spec = {
  keys: string[];
  type: InferredLot["type"];
  symbol: string | null;
  name: string;
};

const SPECS: Spec[] = [
  { keys: ["біткоін", "біткойн", "bitcoin", "btc"], type: "crypto", symbol: "BTC", name: "Bitcoin" },
  { keys: ["ефіріум", "ефіриум", "етериум", "ethereum", "eth"], type: "crypto", symbol: "ETH", name: "Ethereum" },
  { keys: ["солана", "solana", "sol"], type: "crypto", symbol: "SOL", name: "Solana" },
  { keys: ["spyx", "spy"], type: "stock", symbol: "SPYX", name: "SPYX" },
  { keys: ["cspx"], type: "stock", symbol: "CSPX", name: "CSPX" },
  { keys: ["nvdax", "nvidia", "нвідіа", "нівідіа", "nvda"], type: "stock", symbol: "NVDAX", name: "NVDAX" },
  { keys: ["овдп", "облігац"], type: "bond", symbol: null, name: "ОВДП" },
  { keys: ["квартира", "нерухом", "апартамент", "apartment"], type: "real_estate", symbol: null, name: "Квартира" },
];

const CRYPTO_TICKERS = new Set(["btc", "eth", "sol", "bnb", "xrp", "ada", "doge", "ton", "avax", "dot", "link", "matic", "trx", "ltc", "near", "atom", "uni", "sui", "pepe"]);
const CURRENCY_CODES = new Set(["uah", "usd", "eur", "gbp", "pln"]);

function matchesKey(folded: string, key: string): boolean {
  if (folded === key) return true;
  if (key.length < 3) return false;
  const tokens = folded.split(" ");
  return tokens.includes(key) || folded.includes(key);
}

export function inferLotFromCategory(name: string | null | undefined): InferredLot | null {
  if (!name?.trim()) return null;
  const folded = fold(name);
  if (!folded || IGNORE_EXACT.has(folded)) return null;

  for (const spec of SPECS) {
    if (spec.keys.some((key) => matchesKey(folded, key))) {
      return { type: spec.type, symbol: spec.symbol, name: spec.name };
    }
  }

  const compact = folded.replace(/\s/g, "");
  if (CRYPTO_TICKERS.has(compact)) {
    const symbol = compact.toUpperCase();
    return { type: "crypto", symbol, name: symbol };
  }
  if (/^[a-z]{3,6}x?$/.test(compact) && !CURRENCY_CODES.has(compact)) {
    const symbol = compact.toUpperCase();
    return { type: "stock", symbol, name: symbol };
  }
  return null;
}

export function isAssetBuy(
  type: string,
  dest: InferredLot | null,
  source: InferredLot | null,
): dest is InferredLot {
  if (!dest) return false;
  if (type === "income") return true;
  return type === "expense" && source == null;
}

export function lotFromTransaction(input: {
  type: string;
  categoryName: string | null | undefined;
  sourceCategoryName?: string | null;
}): InferredLot | null {
  const dest = inferLotFromCategory(input.categoryName);
  const source = inferLotFromCategory(input.sourceCategoryName);
  return isAssetBuy(input.type, dest, source) ? dest : null;
}
