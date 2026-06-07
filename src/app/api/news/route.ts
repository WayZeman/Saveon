import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { getInvestmentNews } from "@/lib/investment-news";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;

  try {
    const data = await getInvestmentNews();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Не вдалося завантажити новини" }, { status: 502 });
  }
}
