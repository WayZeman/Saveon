import type { SessionUser } from "@/lib/auth";
import { transactionUserIds } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { recordsFromTransactions, toHoldingTx } from "@/lib/cortex/from-transactions";
import { valuePortfolio } from "@/lib/cortex/valuate";
import type { PortfolioSnapshot } from "@/lib/cortex/types";
import { syncHoldingsForUsers } from "@/lib/asset-sync";

const lastPrep = new Map<string, number>();
const PREP_TTL_MS = 60_000;

export async function loadPortfolio(session: SessionUser): Promise<PortfolioSnapshot> {
  const userIds = transactionUserIds(session);
  const prepKey = userIds.slice().sort().join(",");
  const now = Date.now();
  if (!lastPrep.has(prepKey) || now - lastPrep.get(prepKey)! > PREP_TTL_MS) {
    lastPrep.set(prepKey, now);
    await syncHoldingsForUsers(userIds);
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, assetSymbol: { not: null } },
    select: {
      type: true,
      amount: true,
      categoryId: true,
      sourceCategoryId: true,
      assetSymbol: true,
      assetName: true,
      assetClass: true,
      unitPriceUsd: true,
      quantity: true,
      usdRateUah: true,
      createdAt: true,
      category: { select: { name: true } },
      sourceCategory: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return valuePortfolio(recordsFromTransactions(transactions.map(toHoldingTx)));
}
