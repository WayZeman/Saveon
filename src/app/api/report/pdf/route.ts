import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { fetchReportData } from "@/lib/report-data";
import { buildReportPdf } from "@/lib/report-pdf";
import { parseReportPeriod, toDateInputValue } from "@/lib/report-period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;

  const { searchParams } = new URL(request.url);
  const parsed = parseReportPeriod(searchParams.get("from"), searchParams.get("to"));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const data = await fetchReportData(sessionOr, parsed);
    const pdf = await buildReportPdf(data);
    const filename = `saveon-zvit-${toDateInputValue(parsed.from)}_${toDateInputValue(parsed.to)}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[report/pdf]", e);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: isDev ? `Не вдалося згенерувати звіт: ${message}` : "Не вдалося згенерувати звіт" },
      { status: 500 }
    );
  }
}
