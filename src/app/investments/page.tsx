import { redirect } from "next/navigation";
import { CortexDashboard } from "@/components/cortex/CortexDashboard";
import { getSession } from "@/lib/auth";
import { loadPortfolio } from "@/lib/cortex/portfolio";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const initial = await loadPortfolio(session);
  return <CortexDashboard initial={initial} />;
}
