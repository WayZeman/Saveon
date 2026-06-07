"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw, TrendingUp, Bitcoin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type FearGreedItem = {
  market: "stocks" | "crypto";
  value: number;
  classification: string;
  updatedAt: string;
};

type FearGreedData = {
  stocks: FearGreedItem | null;
  crypto: FearGreedItem | null;
};

const CLASSIFICATION_KEYS: Record<string, string> = {
  "Extreme Fear": "fearGreed_extremeFear",
  Fear: "fearGreed_fear",
  Neutral: "fearGreed_neutral",
  Greed: "fearGreed_greed",
  "Extreme Greed": "fearGreed_extremeGreed",
};

function getTone(value: number): { color: string; bg: string } {
  if (value <= 25) return { color: "var(--accent-red)", bg: "var(--accent-red)" };
  if (value <= 45) return { color: "var(--accent-orange)", bg: "var(--accent-orange)" };
  if (value <= 55) return { color: "var(--text-secondary)", bg: "var(--text-tertiary)" };
  if (value <= 75) return { color: "var(--accent-green)", bg: "var(--accent-green)" };
  return { color: "#22c55e", bg: "var(--accent-green)" };
}

function FearGreedGauge({
  item,
  title,
  icon,
}: {
  item: FearGreedItem;
  title: string;
  icon: React.ReactNode;
}) {
  const { t } = useLanguage();
  const tone = getTone(item.value);
  const labelKey = CLASSIFICATION_KEYS[item.classification];
  const label = labelKey ? t(labelKey) : item.classification;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--input-bg)]/70 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]">
          {icon}
        </span>
        <span className="text-[14px] font-semibold text-[var(--text)]">{title}</span>
      </div>

      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: tone.color }}>
            {item.value}
          </span>
          <span className="text-[12px] text-[var(--text-tertiary)] pb-0.5">/ 100</span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ color: tone.color, backgroundColor: `color-mix(in srgb, ${tone.bg} 14%, transparent)` }}
        >
          {label}
        </span>
      </div>

      <div className="relative h-2.5 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--input-bg)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${item.value}%`,
            background: `linear-gradient(90deg, var(--accent-red) 0%, var(--accent-orange) 35%, var(--accent-green) 100%)`,
            opacity: 0.85,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
          style={{
            left: `calc(${item.value}% - 7px)`,
            backgroundColor: tone.bg,
          }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[10px] font-medium text-[var(--text-tertiary)]">
        <span>{t("fearGreed_fear")}</span>
        <span>{t("fearGreed_greed")}</span>
      </div>
    </div>
  );
}

export function FearGreedIndex() {
  const { t } = useLanguage();
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/fear-greed", { cache: isRefresh ? "no-store" : "default" });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { data: FearGreedData };
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card opacity-0 animate-slide-up animate-stagger-6 overflow-hidden scroll-mt-4 !p-0">
      <div className="relative px-5 pt-5 pb-4 md:px-6 md:pt-6 border-b border-[var(--border)]">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[var(--accent-orange)]/8 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-[var(--accent-orange)]/14 border border-[var(--accent-orange)]/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[var(--accent-orange)]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] md:text-lg font-semibold text-[var(--text)]">{t("fearGreed_title")}</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{t("fearGreed_hint")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="shrink-0 rounded-xl p-2.5 text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--input-bg)] transition disabled:opacity-40"
            title={t("fearGreed_refresh")}
            aria-label={t("fearGreed_refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="px-5 py-5 md:px-6 md:py-6">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] p-4 space-y-4">
                <div className="h-4 w-20 rounded bg-[var(--surface-secondary)]" />
                <div className="h-9 w-14 rounded bg-[var(--surface-secondary)]" />
                <div className="h-2.5 rounded-full bg-[var(--surface-secondary)]" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="py-6 text-center">
            <p className="text-[14px] text-[var(--text-secondary)]">{t("fearGreed_error")}</p>
            <button
              type="button"
              onClick={() => load(true)}
              className="mt-3 rounded-xl px-4 py-2 text-[13px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/15 transition"
            >
              {t("fearGreed_refresh")}
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div
            className={`grid gap-3 ${
              data.stocks && data.crypto ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md mx-auto w-full"
            }`}
          >
            {data.stocks && (
              <FearGreedGauge
                item={data.stocks}
                title={t("fearGreed_stocks")}
                icon={<TrendingUp className="w-4 h-4 text-[var(--accent-green)]" strokeWidth={2} />}
              />
            )}
            {data.crypto && (
              <FearGreedGauge
                item={data.crypto}
                title={t("fearGreed_crypto")}
                icon={<Bitcoin className="w-4 h-4 text-[var(--accent-purple)]" strokeWidth={2} />}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
