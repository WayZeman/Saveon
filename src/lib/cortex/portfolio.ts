import type { SessionUser } from "@/lib/auth";
import { investmentsVisibleWhere, transactionUserIds } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { toInvestmentRecord } from "@/lib/cortex/records";
import { valuePortfolio } from "@/lib/cortex/valuate";
import type { PortfolioSnapshot } from "@/lib/cortex/types";
import { syncHoldingsForUsers } from "@/lib/asset-sync";

const receiptInclude = { receipts: { orderBy: { receivedAt: "asc" as const } } };
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

  const rows = await prisma.investment.findMany({
    where: investmentsVisibleWhere(session),
    orderBy: { createdAt: "asc" },
    include: receiptInclude,
  });
  return valuePortfolio(rows.map(toInvestmentRecord));
}
