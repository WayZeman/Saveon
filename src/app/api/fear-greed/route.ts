import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { getFearGreedIndex } from "@/lib/fear-greed";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;

  try {
    const result = await getFearGreedIndex();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch {
    return NextResponse.json({ error: "Не вдалося завантажити індекс" }, { status: 502 });
  }
}
