export type CashflowTx = {
  type: string;
  amount: number;
  userId?: string;
  categoryId: string;
  sourceCategoryId: string | null;
  createdAt: Date | string;
};

/** Категорії, де реально лежать гроші: куди заходили доходи або звідки списували витрати. */
export function walletCategoryIds(txs: CashflowTx[]): Set<string> {
  const ids = new Set<string>();
  for (const tx of txs) {
    if (tx.type === "income") ids.add(tx.categoryId);
    if (tx.type === "expense" && tx.sourceCategoryId) ids.add(tx.sourceCategoryId);
  }
  return ids;
}

/**
 * Прибирає внутрішні перекази між гаманцями (готівка → BTC тощо).
 * Інакше кожне перекладання рахується і як витрата, і як новий дохід.
 */
export function excludeInternalTransfers<T extends CashflowTx>(txs: T[]): T[] {
  const wallets = walletCategoryIds(txs);
  const skip = new Set<number>();

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (tx.type !== "expense" || !wallets.has(tx.categoryId)) continue;

    skip.add(i);
    const txTime = new Date(tx.createdAt).getTime();
    let best = -1;
    let bestDt = Infinity;
    for (let j = 0; j < txs.length; j++) {
      if (skip.has(j)) continue;
      const other = txs[j];
      if (other.type !== "income") continue;
      if (other.categoryId !== tx.categoryId) continue;
      if (tx.userId && other.userId && tx.userId !== other.userId) continue;
      if (Math.abs(other.amount - tx.amount) > 0.02) continue;
      const dt = Math.abs(new Date(other.createdAt).getTime() - txTime);
      if (dt < bestDt) {
        bestDt = dt;
        best = j;
      }
    }
    if (best >= 0) skip.add(best);
  }

  return txs.filter((_, index) => !skip.has(index));
}

export function sumIncomeExpense(txs: CashflowTx[]): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expense += tx.amount;
  }
  return { income, expense };
}
