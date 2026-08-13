export type AssetClass = "crypto" | "stock" | "etf";
export type CategoryKind = "cash" | "stock" | "crypto" | "other";

export type CatalogAsset = {
  symbol: string;
  name: string;
  class: AssetClass;
  aliases: string[];
};

function item(symbol: string, name: string, assetClass: AssetClass, extraAliases: string[] = []): CatalogAsset {
  const aliases = new Set<string>([
    symbol.toLowerCase(),
    name.toLowerCase(),
    ...extraAliases.map((a) => a.toLowerCase()),
  ]);
  return { symbol, name, class: assetClass, aliases: Array.from(aliases) };
}

export const CRYPTO_ASSETS: CatalogAsset[] = [
  item("BTC", "Bitcoin", "crypto", ["біткоїн", "біткоін", "біткойн", "bitcoin"]),
  item("ETH", "Ethereum", "crypto", ["ефіріум", "ефіриум", "етериум", "ether"]),
  item("SOL", "Solana", "crypto", ["солана"]),
  item("XRP", "XRP", "crypto", ["ріпл", "ripple"]),
  item("BNB", "BNB", "crypto", ["binance coin"]),
  item("ADA", "Cardano", "crypto", ["кардано"]),
  item("DOGE", "Dogecoin", "crypto", ["доге", "додж"]),
  item("AVAX", "Avalanche", "crypto", ["аваланч"]),
  item("DOT", "Polkadot", "crypto", ["полкадот"]),
  item("LINK", "Chainlink", "crypto", ["чейнлінк"]),
  item("TON", "Toncoin", "crypto", ["тон"]),
  item("TRX", "TRON", "crypto", ["трон"]),
  item("MATIC", "Polygon", "crypto", ["полігон", "pol"]),
  item("UNI", "Uniswap", "crypto"),
  item("ATOM", "Cosmos", "crypto", ["космос"]),
  item("LTC", "Litecoin", "crypto", ["лайткоїн", "лайткоін"]),
  item("BCH", "Bitcoin Cash", "crypto"),
  item("NEAR", "NEAR Protocol", "crypto"),
  item("APT", "Aptos", "crypto"),
  item("SUI", "Sui", "crypto"),
  item("XLM", "Stellar", "crypto", ["стелар"]),
  item("ETC", "Ethereum Classic", "crypto"),
  item("FIL", "Filecoin", "crypto"),
  item("ICP", "Internet Computer", "crypto"),
  item("HBAR", "Hedera", "crypto"),
  item("ALGO", "Algorand", "crypto"),
  item("VET", "VeChain", "crypto"),
  item("AAVE", "Aave", "crypto"),
  item("MKR", "Maker", "crypto"),
  item("LDO", "Lido DAO", "crypto"),
  item("OP", "Optimism", "crypto"),
  item("ARB", "Arbitrum", "crypto"),
  item("PEPE", "Pepe", "crypto"),
  item("SHIB", "Shiba Inu", "crypto", ["шиба"]),
  item("WIF", "dogwifhat", "crypto"),
  item("BONK", "Bonk", "crypto"),
  item("RENDER", "Render", "crypto", ["rndr"]),
  item("INJ", "Injective", "crypto"),
  item("FET", "Artificial Superintelligence Alliance", "crypto", ["fetch"]),
  item("TAO", "Bittensor", "crypto"),
  item("TIA", "Celestia", "crypto"),
  item("SEI", "Sei", "crypto"),
  item("STX", "Stacks", "crypto"),
  item("IMX", "Immutable", "crypto"),
  item("GRT", "The Graph", "crypto"),
  item("ENS", "Ethereum Name Service", "crypto"),
  item("SAND", "The Sandbox", "crypto"),
  item("MANA", "Decentraland", "crypto"),
  item("AXS", "Axie Infinity", "crypto"),
  item("JUP", "Jupiter", "crypto"),
  item("WLD", "Worldcoin", "crypto"),
  item("ONDO", "Ondo", "crypto"),
  item("RUNE", "THORChain", "crypto"),
  item("CRV", "Curve DAO", "crypto"),
  item("PENDLE", "Pendle", "crypto"),
  item("USDT", "Tether", "crypto", ["тезер"]),
  item("USDC", "USD Coin", "crypto"),
];

export const STOCK_ASSETS: CatalogAsset[] = [
  item("AAPL", "Apple", "stock", ["еппл", "ейпл"]),
  item("MSFT", "Microsoft", "stock", ["майкрософт"]),
  item("NVDA", "NVIDIA", "stock", ["нвідіа", "нівідіа"]),
  item("GOOGL", "Alphabet", "stock", ["google", "гугл"]),
  item("AMZN", "Amazon", "stock", ["амазон"]),
  item("META", "Meta Platforms", "stock", ["facebook", "фейсбук", "мета"]),
  item("TSLA", "Tesla", "stock", ["тесла"]),
  item("BRK-B", "Berkshire Hathaway", "stock", ["berkshire"]),
  item("AVGO", "Broadcom", "stock"),
  item("JPM", "JPMorgan Chase", "stock", ["jpmorgan"]),
  item("V", "Visa", "stock", ["віза"]),
  item("MA", "Mastercard", "stock"),
  item("UNH", "UnitedHealth", "stock"),
  item("XOM", "Exxon Mobil", "stock"),
  item("LLY", "Eli Lilly", "stock"),
  item("JNJ", "Johnson & Johnson", "stock"),
  item("WMT", "Walmart", "stock"),
  item("PG", "Procter & Gamble", "stock"),
  item("HD", "Home Depot", "stock"),
  item("COST", "Costco", "stock"),
  item("NFLX", "Netflix", "stock", ["нетфлікс"]),
  item("AMD", "AMD", "stock"),
  item("ORCL", "Oracle", "stock"),
  item("CRM", "Salesforce", "stock"),
  item("KO", "Coca-Cola", "stock", ["кока-кола", "кола"]),
  item("PEP", "PepsiCo", "stock", ["пепсі"]),
  item("DIS", "Disney", "stock", ["дісней"]),
  item("ADBE", "Adobe", "stock"),
  item("CSCO", "Cisco", "stock"),
  item("INTC", "Intel", "stock", ["інтел"]),
  item("QCOM", "Qualcomm", "stock"),
  item("TXN", "Texas Instruments", "stock"),
  item("AMAT", "Applied Materials", "stock"),
  item("MU", "Micron", "stock"),
  item("NOW", "ServiceNow", "stock"),
  item("INTU", "Intuit", "stock"),
  item("UBER", "Uber", "stock", ["убер"]),
  item("SHOP", "Shopify", "stock"),
  item("PLTR", "Palantir", "stock", ["палантір"]),
  item("SNOW", "Snowflake", "stock"),
  item("ARM", "Arm Holdings", "stock"),
  item("COIN", "Coinbase", "stock"),
  item("MSTR", "MicroStrategy", "stock", ["strategy"]),
  item("BA", "Boeing", "stock", ["боїнг"]),
  item("NKE", "Nike", "stock", ["найк"]),
  item("MCD", "McDonald's", "stock", ["макдональдс"]),
  item("GE", "GE Aerospace", "stock"),
  item("CAT", "Caterpillar", "stock"),
  item("GS", "Goldman Sachs", "stock"),
  item("MS", "Morgan Stanley", "stock"),
  item("BAC", "Bank of America", "stock"),
  item("WFC", "Wells Fargo", "stock"),
  item("TSM", "TSMC", "stock"),
  item("ASML", "ASML", "stock"),
  item("NVO", "Novo Nordisk", "stock"),
  item("SAP", "SAP", "stock"),
  item("BABA", "Alibaba", "stock", ["алібаба"]),
  item("PFE", "Pfizer", "stock", ["пфайзер"]),
  item("ABBV", "AbbVie", "stock"),
  item("MRK", "Merck", "stock"),
  item("T", "AT&T", "stock"),
  item("VZ", "Verizon", "stock"),
];

export const ETF_ASSETS: CatalogAsset[] = [
  item("CSPX.L", "iShares Core S&P 500 UCITS ETF", "etf", ["cspx", "cspx.l"]),
  item("VUAA.L", "Vanguard S&P 500 UCITS ETF", "etf", ["vuaa"]),
  item("VWRA.L", "Vanguard FTSE All-World UCITS ETF", "etf", ["vwra"]),
  item("SXR8.DE", "iShares Core S&P 500 UCITS ETF (Xetra)", "etf", ["sxr8"]),
  item("SPY", "SPDR S&P 500 ETF", "etf", ["s&p 500", "sp500"]),
  item("VOO", "Vanguard S&P 500 ETF", "etf"),
  item("IVV", "iShares Core S&P 500 ETF", "etf"),
  item("QQQ", "Invesco QQQ Trust", "etf", ["nasdaq 100", "nasdaq"]),
  item("QQQM", "Invesco NASDAQ 100 ETF", "etf"),
  item("VTI", "Vanguard Total Stock Market ETF", "etf"),
  item("IWM", "iShares Russell 2000 ETF", "etf"),
  item("DIA", "SPDR Dow Jones Industrial Average ETF", "etf", ["dow"]),
  item("VGT", "Vanguard Information Technology ETF", "etf"),
  item("XLK", "Technology Select Sector SPDR", "etf"),
  item("XLF", "Financial Select Sector SPDR", "etf"),
  item("XLE", "Energy Select Sector SPDR", "etf"),
  item("XLV", "Health Care Select Sector SPDR", "etf"),
  item("SCHD", "Schwab US Dividend Equity ETF", "etf"),
  item("VYM", "Vanguard High Dividend Yield ETF", "etf"),
  item("VIG", "Vanguard Dividend Appreciation ETF", "etf"),
  item("JEPI", "JPMorgan Equity Premium Income ETF", "etf"),
  item("JEPQ", "JPMorgan Nasdaq Equity Premium Income ETF", "etf"),
  item("GLD", "SPDR Gold Shares", "etf", ["золото", "gold"]),
  item("IAU", "iShares Gold Trust", "etf"),
  item("SLV", "iShares Silver Trust", "etf", ["срібло"]),
  item("VNQ", "Vanguard Real Estate ETF", "etf"),
  item("BND", "Vanguard Total Bond Market ETF", "etf"),
  item("AGG", "iShares Core US Aggregate Bond ETF", "etf"),
  item("TLT", "iShares 20+ Year Treasury Bond ETF", "etf"),
  item("EFA", "iShares MSCI EAFE ETF", "etf"),
  item("EEM", "iShares MSCI Emerging Markets ETF", "etf"),
  item("VWO", "Vanguard FTSE Emerging Markets ETF", "etf"),
  item("VEA", "Vanguard FTSE Developed Markets ETF", "etf"),
  item("VT", "Vanguard Total World Stock ETF", "etf"),
  item("VXUS", "Vanguard Total International Stock ETF", "etf"),
  item("SOXX", "iShares Semiconductor ETF", "etf"),
  item("SMH", "VanEck Semiconductor ETF", "etf"),
  item("ARKK", "ARK Innovation ETF", "etf"),
  item("IBIT", "iShares Bitcoin Trust ETF", "etf"),
  item("FBTC", "Fidelity Wise Origin Bitcoin Fund", "etf"),
  item("ETHA", "iShares Ethereum Trust ETF", "etf"),
  item("SPLG", "SPDR Portfolio S&P 500 ETF", "etf"),
  item("ITOT", "iShares Core S&P Total US Stock Market ETF", "etf"),
];

export const ALL_ASSETS: CatalogAsset[] = [...CRYPTO_ASSETS, ...STOCK_ASSETS, ...ETF_ASSETS];

const bySymbol = new Map(ALL_ASSETS.map((a) => [a.symbol.toUpperCase(), a]));

export function getCatalogAsset(symbol: string): CatalogAsset | undefined {
  return bySymbol.get(symbol.trim().toUpperCase());
}

export function yahooSymbolFor(asset: { symbol: string; class: AssetClass } | CatalogAsset): string {
  if (asset.class === "crypto") {
    return asset.symbol.includes("-") ? asset.symbol : `${asset.symbol}-USD`;
  }
  return asset.symbol;
}

export function canonicalSymbol(yahooOrSymbol: string, assetClass?: AssetClass | string | null): string {
  const raw = yahooOrSymbol.trim().toUpperCase();
  if ((assetClass === "crypto" || raw.endsWith("-USD")) && raw.endsWith("-USD")) {
    return raw.slice(0, -4);
  }
  return raw;
}

export function assetsForKind(kind: CategoryKind): CatalogAsset[] {
  if (kind === "crypto") return CRYPTO_ASSETS;
  if (kind === "stock") return [...STOCK_ASSETS, ...ETF_ASSETS];
  return [];
}

export function searchCatalog(query: string, kind: CategoryKind, limit = 20): CatalogAsset[] {
  const pool = assetsForKind(kind);
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((a) => a.symbol.toLowerCase().includes(q) || a.aliases.some((alias) => alias.includes(q)))
    .slice(0, limit);
}

const PREFIX_RE = /^(акції та etf|акції|stocks?|etf|фонд|криптовалюта|крипта|crypto)\s+/i;
const TICKER_RE = /\b([A-Za-z]{1,5}(?:[.-][A-Za-z0-9]{1,3})?)\b/g;

function matchExactAsset(n: string): CatalogAsset | null {
  for (const asset of ALL_ASSETS) {
    if (asset.symbol.toLowerCase() === n) return asset;
    if (asset.aliases.includes(n)) return asset;
  }
  return null;
}

export function inferAssetFromName(name: string): CatalogAsset | null {
  const raw = name.trim();
  if (!raw) return null;
  const n = raw.toLowerCase();

  const exact = matchExactAsset(n);
  if (exact) return exact;

  const stripped = n.replace(PREFIX_RE, "").trim();
  if (stripped && stripped !== n) {
    const fromStripped = matchExactAsset(stripped);
    if (fromStripped) return fromStripped;
  }

  const tickers = raw.toUpperCase().match(TICKER_RE) ?? [];
  for (const token of tickers) {
    const fromTicker = getCatalogAsset(token);
    if (fromTicker) return fromTicker;
  }
  for (const token of tickers) {
    if (token.includes(".") || token.length >= 4) {
      return {
        symbol: token,
        name: token,
        class: token.includes(".") ? "etf" : "stock",
        aliases: [token.toLowerCase()],
      };
    }
  }

  for (const asset of ALL_ASSETS) {
    for (const alias of asset.aliases) {
      if (alias.length >= 4 && n.includes(alias)) return asset;
    }
  }
  return null;
}

export function inferCategoryKind(name: string): CategoryKind {
  const n = name.trim().toLowerCase();
  const fromAsset = inferAssetFromName(name);
  if (fromAsset?.class === "crypto") return "crypto";
  if (fromAsset?.class === "stock" || fromAsset?.class === "etf") return "stock";
  if (/(крипт|crypto|coin|бітко|bitcoin|ethereum|solana)/i.test(n)) return "crypto";
  if (/(акці|stock|etf|фонд|s&p|nasdaq|spy|qqq)/i.test(n)) return "stock";
  if (/(готів|cash|картк|банк|депозит|гривн)/i.test(n)) return "cash";
  return "other";
}

export function marketKindForCategory(kind: string | null | undefined): "stock" | "crypto" | null {
  if (kind === "stock" || kind === "crypto") return kind;
  return null;
}
