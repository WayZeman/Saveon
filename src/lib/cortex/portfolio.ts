import type { SessionUser } from "@/lib/auth";
import { investmentsVisibleWhere } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { toInvestmentRecord } from "@/lib/cortex/records";
import { valuePortfolio } from "@/lib/cortex/valuate";
import type { PortfolioSnapshot } from "@/lib/cortex/types";
import { purgeAutoSyncedInvestments } from "@/lib/cortex/purge-auto-sync";

const receiptInclude = { receipts: { orderBy: { receivedAt: "asc" as const } } };

export async function loadPortfolio(session: SessionUser): Promise<PortfolioSnapshot> {
  await purgeAutoSyncedInvestments();
  const rows = await prisma.investment.findMany({
    where: investmentsVisibleWhere(session),
    orderBy: { createdAt: "asc" },
    include: receiptInclude,
  });
  return valuePortfolio(rows.map(toInvestmentRecord));
}
