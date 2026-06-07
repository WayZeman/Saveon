"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, Bitcoin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category?: "stocks" | "crypto";
};

type NewsFilter = "all" | "stocks" | "crypto";

const VISIBLE_COUNT = 6;

function formatRelativeTime(iso: string, t: (key: string, ...args: string[]) => string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t("home_newsJustNow");
  if (mins < 60) return t("home_newsMinutesAgo", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("home_newsHoursAgo", String(hours));
  const days = Math.floor(hours / 24);
  return t("home_newsDaysAgo", String(days));
}

function CategoryBadge({
  category,
  t,
}: {
  category: "stocks" | "crypto";
  t: (key: string) => string;
}) {
  const isCrypto = category === "crypto";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
        isCrypto
          ? "bg-[var(--accent-teal)]/14 text-[var(--accent-teal)]"
          : "bg-[var(--accent-green)]/14 text-[var(--accent-green)]"
      }`}
    >
      {isCrypto ? <Bitcoin className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={2} /> : <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={2} />}
      {isCrypto ? t("home_newsCrypto") : t("home_newsStocks")}
    </span>
  );
}

export function NewsSection() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [expanded, setExpanded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/news", { cache: isRefresh ? "no-store" : "default" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { items: NewsItem[]; updatedAt?: string };
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const counts = useMemo(
    () => ({
      all: items.length,
      stocks: items.filter((i) => i.category === "stocks").length,
      crypto: items.filter((i) => i.category === "crypto").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const visible = expanded ? filtered : filtered.slice(0, VISIBLE_COUNT);

  const filters: { id: NewsFilter; label: string; count: number }[] = [
    { id: "all", label: t("home_newsAll"), count: counts.all },
    { id: "stocks", label: t("home_newsStocks"), count: counts.stocks },
    { id: "crypto", label: t("home_newsCrypto"), count: counts.crypto },
  ];

  return (
    <section className="card opacity-0 animate-slide-up animate-stagger-7 overflow-hidden scroll-mt-4">
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
            <Newspaper className="w-[18px] h-[18px] text-[var(--accent-primary)] shrink-0" strokeWidth={2} />
            <span className="truncate">{t("home_news")}</span>
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">
            {t("home_newsHint")}
          </p>
          {updatedAt && !loading && (
            <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mt-1">
              {t("home_newsUpdated")} {formatRelativeTime(updatedAt, t)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadNews(true)}
          disabled={loading || refreshing}
          className="shrink-0 rounded-xl p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--input-bg)] active:scale-95 transition disabled:opacity-40 touch-manipulation"
          title={t("home_newsRefresh")}
          aria-label={t("home_newsRefresh")}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
        </button>
      </div>

      {!loading && !error && items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setExpanded(false);
                }}
                className={`shrink-0 rounded-full px-3 py-2 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-[12px] font-semibold transition touch-manipulation active:scale-[0.97] min-h-[36px] ${
                  active
                    ? "bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-glow"
                    : "bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="space-y-2 sm:space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-3.5 sm:p-4 animate-pulse space-y-2"
            >
              <div className="h-3 w-24 rounded bg-[var(--surface-secondary)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--surface-secondary)]" />
              <div className="h-3 w-full rounded bg-[var(--surface-secondary)]/80" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] py-8 sm:py-10 px-4 text-center">
          <Newspaper className="w-8 h-8 sm:w-9 sm:h-9 mx-auto mb-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <p className="text-[13px] sm:text-[14px] text-[var(--text-secondary)]">{t("home_newsError")}</p>
          <button
            type="button"
            onClick={() => loadNews(true)}
            className="mt-3 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/15 active:scale-[0.98] transition touch-manipulation"
          >
            {t("home_newsRefresh")}
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-8 sm:py-10 text-center text-[var(--text-tertiary)] text-[13px] sm:text-[14px]">
          {t("home_newsEmpty")}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-2 sm:space-y-2.5">
          <ul className="space-y-2 sm:space-y-2.5">
            {visible.map((item, index) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-2.5 sm:gap-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] px-3.5 py-3 sm:px-4 sm:py-3.5 transition hover:border-[var(--border-strong)] hover:bg-[var(--input-bg-focus)] active:scale-[0.995] touch-manipulation"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                      {item.category && <CategoryBadge category={item.category} t={t} />}
                      <span className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] truncate">
                        {item.source}
                        {item.publishedAt ? ` · ${formatRelativeTime(item.publishedAt, t)}` : ""}
                      </span>
                    </div>
                    <h3
                      className={`font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent-primary)] transition line-clamp-2 ${
                        index === 0 ? "text-[15px] sm:text-[16px] md:text-[17px]" : "text-[13px] sm:text-[14px]"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 hidden sm:block">
                      {item.summary}
                    </p>
                  </div>
                  <ExternalLink
                    className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-tertiary)] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    strokeWidth={2}
                  />
                </a>
              </li>
            ))}
          </ul>

          {filtered.length > VISIBLE_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full rounded-xl border border-[var(--border)] py-3 sm:py-2.5 text-[12px] sm:text-[13px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/8 hover:bg-[var(--accent-primary)]/12 active:scale-[0.99] transition touch-manipulation min-h-[44px]"
            >
              {expanded ? t("home_newsShowLess") : t("home_newsShowMore", String(filtered.length - VISIBLE_COUNT))}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
