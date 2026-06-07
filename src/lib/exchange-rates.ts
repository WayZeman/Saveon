export async function getExchangeRates(): Promise<{ usd: number; eur: number }> {
  try {
    const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("NBU fetch failed");
    const data = (await res.json()) as { cc: string; rate: number }[];
    const usd = data.find((x) => x.cc === "USD")?.rate ?? 41;
    const eur = data.find((x) => x.cc === "EUR")?.rate ?? 45;
    return { usd, eur };
  } catch {
    return { usd: 41, eur: 45 };
  }
}
