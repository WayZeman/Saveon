import { prisma } from "@/lib/prisma";
import { getUsdUah, lockPurchaseQuote, currentMarketQuote } from "@/lib/cortex/quotes";
import { lotFromTransaction } from "@/lib/cortex/infer-from-category";
import { roundCents } from "@/lib/cortex/money";

export const TX_LOT_NOTE_PREFIX = "saveon:tx:";

export function txLotNote(transactionId: string): string {
  return `${TX_LOT_NOTE_PREFIX}${transactionId}`;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

type TxForLot = {
  id: string;
  amount: number;
  type: string;
  createdAt: Date;
  category: { name: string } | null;
  sourceCategory?: { name: string } | null;
};

async function lockQuote(type: string, symbol: string | null, purchaseDate: Date) {
  try {
    const locked = await lockPurchaseQuote({ type, symbol, purchaseDate });
    if (locked) return locked;
  } catch {
    /* fall through to live quote so a new lot still appears */
  }
  try {
    if (type === "real_estate" || type === "bond") {
      const price = await getUsdUah(purchaseDate);
      return { price, currency: "UAH", label: "USD/UAH" };
    }
    const live = await currentMarketQuote({ type, symbol });
    if (live) return { price: live.price, currency: "USD", label: live.label };
  } catch {
    return null;
  }
  return null;
}

/** One Cortex circle per qualifying buy. Existing txs are not backfilled. */
export async function syncLotForTransaction(userId: string, tx: TxForLot): Promise<void> {
  const lot = lotFromTransaction({
    type: tx.type,
    categoryName: tx.category?.name,
    sourceCategoryName: tx.sourceCategory?.name,
  });
  const notes = txLotNote(tx.id);
  const existing = await prisma.investment.findFirst({ where: { notes } });

  if (!lot) {
    if (existing) await prisma.investment.delete({ where: { id: existing.id } });
    return;
  }

  const purchaseDate = tx.createdAt;
  let investedAmount = tx.amount;
  let investedCurrency: "USD" | "UAH" = "UAH";
  let quantity: number | null = null;
  let purchaseUnitPrice: number | null = null;
  let purchaseUnitCurrency: string | null = null;

  const locked = await lockQuote(lot.type, lot.symbol, purchaseDate);
  if (locked) {
    purchaseUnitPrice = locked.price;
    purchaseUnitCurrency = locked.currency;
  }

  if (lot.type === "crypto" || lot.type === "stock") {
    try {
      const usdUah = await getUsdUah(purchaseDate);
      if (usdUah > 0) {
        investedAmount = tx.amount / usdUah;
        investedCurrency = "USD";
        if (locked?.currency === "USD" && locked.price > 0) {
          quantity = round8(investedAmount / locked.price);
        }
      }
    } catch {
      /* keep UAH cost so the circle still appears */
    }
  }

  const data = {
    name: lot.symbol ?? lot.name,
    type: lot.type,
    symbol: lot.symbol,
    investedAmount: roundCents(investedAmount),
    investedCurrency,
    quantity,
    purchaseDate,
    purchaseUnitPrice,
    purchaseUnitCurrency,
    notes,
  };

  if (existing) {
    await prisma.investment.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.investment.create({ data: { userId, ...data } });
}

export async function deleteLotForTransaction(transactionId: string): Promise<void> {
  await prisma.investment.deleteMany({ where: { notes: txLotNote(transactionId) } });
}

export async function syncLotForTransactionSafe(userId: string, tx: TxForLot): Promise<void> {
  try {
    await syncLotForTransaction(userId, tx);
  } catch (error) {
    console.error("cortex lot from transaction", error);
  }
}
