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
  accent,
}: {
  item: FearGreedItem;
  title: string;
  icon: React.ReactNode;
  accent: string;
}) {
  const { t } = useLanguage();
  const tone = getTone(item.value);
  const labelKey = CLASSIFICATION_KEYS[item.classification];
  const label = labelKey ? t(labelKey) : item.classification;

  return (
    <div className="rounded-xl bg-[var(--input-bg)] border border-[var(--border)] p-3 sm:p-4 flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border shrink-0"
          style={{
            color: accent,
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          {icon}
        </span>
        <span className="text-[12px] sm:text-[14px] font-semibold text-[var(--text)] truncate">{title}</span>
      </div>

      <div className="flex items-end justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-1 min-w-0">
          <span
            className="text-[26px] sm:text-3xl md:text-4xl font-bold tracking-tight leading-none"
            style={{ color: tone.color }}
          >
            {item.value}
          </span>
          <span className="text-[10px] sm:text-[12px] text-[var(--text-tertiary)] pb-0.5">/100</span>
        </div>
        <span
          className="shrink-0 max-w-[48%] text-right rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold leading-tight"
          style={{ color: tone.color, backgroundColor: `color-mix(in srgb, ${tone.bg} 14%, transparent)` }}
        >
          {label}
        </span>
      </div>

      <div className="relative h-2 sm:h-2.5 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface)] mt-auto">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${item.value}%`,
            background: `linear-gradient(90deg, var(--accent-red) 0%, var(--accent-orange) 35%, var(--accent-green) 100%)`,
            opacity: 0.9,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white shadow-sm"
          style={{
            left: `clamp(0px, calc(${item.value}% - 6px), calc(100% - 12px))`,
            backgroundColor: tone.bg,
          }}
        />
      </div>

      <div className="flex justify-between mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-medium text-[var(--text-tertiary)]">
        <span>{t("fearGreed_fear")}</span>
        <span>{t("fearGreed_greed")}</span>
      </div>
    </div>
  );
}

function GaugeSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--input-bg)] border border-[var(--border)] p-3 sm:p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--surface-secondary)]" />
        <div className="h-3.5 w-16 rounded bg-[var(--surface-secondary)]" />
      </div>
      <div className="flex justify-between">
        <div className="h-8 w-12 rounded bg-[var(--surface-secondary)]" />
        <div className="h-5 w-20 rounded-full bg-[var(--surface-secondary)]" />
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-secondary)]" />
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
    <section className="card opacity-0 animate-slide-up animate-stagger-6 scroll-mt-4">
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
            <Activity className="w-[18px] h-[18px] text-[var(--accent-orange)] shrink-0" strokeWidth={2} />
            <span className="truncate">{t("fearGreed_title")}</span>
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">
            {t("fearGreed_hint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="shrink-0 rounded-xl p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--input-bg)] active:scale-95 transition disabled:opacity-40 touch-manipulation"
          title={t("fearGreed_refresh")}
          aria-label={t("fearGreed_refresh")}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <GaugeSkeleton />
          <GaugeSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] py-8 sm:py-10 text-center">
          <p className="text-[13px] sm:text-[14px] text-[var(--text-secondary)]">{t("fearGreed_error")}</p>
          <button
            type="button"
            onClick={() => load(true)}
            className="mt-3 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/15 active:scale-[0.98] transition touch-manipulation"
          >
            {t("fearGreed_refresh")}
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div
          className={`grid gap-2.5 sm:gap-3 ${
            data.stocks && data.crypto
              ? "grid-cols-2"
              : "grid-cols-1 max-w-sm mx-auto w-full sm:max-w-none sm:grid-cols-2"
          }`}
        >
          {data.stocks && (
            <FearGreedGauge
              item={data.stocks}
              title={t("fearGreed_stocks")}
              accent="var(--accent-green)"
              icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />}
            />
          )}
          {data.crypto && (
            <FearGreedGauge
              item={data.crypto}
              title={t("fearGreed_crypto")}
              accent="var(--accent-purple)"
              icon={<Bitcoin className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />}
            />
          )}
        </div>
      )}
    </section>
  );
}
