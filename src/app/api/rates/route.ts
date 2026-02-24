import { NextResponse } from "next/server";

const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

export async function GET() {
  try {
    const res = await fetch(NBU_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("NBU fetch failed");
    const data = (await res.json()) as { cc: string; rate: number }[];
    const usd = data.find((x) => x.cc === "USD")?.rate ?? 41;
    const eur = data.find((x) => x.cc === "EUR")?.rate ?? 45;
    return NextResponse.json({ usd, eur });
  } catch (e) {
    return NextResponse.json({ usd: 41, eur: 45 });
  }
}
