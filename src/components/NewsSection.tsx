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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isCrypto
          ? "bg-[var(--accent-purple)]/14 text-[var(--accent-purple)]"
          : "bg-[var(--accent-green)]/14 text-[var(--accent-green)]"
      }`}
    >
      {isCrypto ? <Bitcoin className="w-3 h-3" strokeWidth={2} /> : <TrendingUp className="w-3 h-3" strokeWidth={2} />}
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
    <section className="card opacity-0 animate-slide-up overflow-hidden scroll-mt-4 !p-0" style={{ animationDelay: "0.42s" }}>
      <div className="relative px-5 pt-5 pb-4 md:px-6 md:pt-6 border-b border-[var(--border)]">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--accent-teal)]/10 via-[var(--accent-blue)]/5 to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-[var(--accent-teal)]/14 border border-[var(--accent-teal)]/20 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-[var(--accent-teal)]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] md:text-lg font-semibold text-[var(--text)]">{t("home_news")}</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-snug">{t("home_newsHint")}</p>
              {updatedAt && !loading && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                  {t("home_newsUpdated")} {formatRelativeTime(updatedAt, t)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadNews(true)}
            disabled={loading || refreshing}
            className="shrink-0 rounded-xl p-2.5 text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--input-bg)] transition disabled:opacity-40"
            title={t("home_newsRefresh")}
            aria-label={t("home_newsRefresh")}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
          </button>
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="relative mt-4 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                    active
                      ? "bg-[var(--accent-blue)] text-white shadow-glow"
                      : "bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 ${active ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>{f.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-4 md:px-6 md:py-5">
        {loading && (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-4 animate-pulse space-y-2">
                <div className="h-3 w-24 rounded bg-[var(--surface-secondary)]" />
                <div className="h-4 w-4/5 rounded bg-[var(--surface-secondary)]" />
                <div className="h-3 w-full rounded bg-[var(--surface-secondary)]/80" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] py-10 px-4 text-center">
            <Newspaper className="w-9 h-9 mx-auto mb-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            <p className="text-[14px] text-[var(--text-secondary)]">{t("home_newsError")}</p>
            <button
              type="button"
              onClick={() => loadNews(true)}
              className="mt-4 rounded-xl px-4 py-2 text-[13px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/15 transition"
            >
              {t("home_newsRefresh")}
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-10 text-center text-[var(--text-tertiary)] text-[14px]">
            {t("home_newsEmpty")}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="space-y-2.5">
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--input-bg)]/60 overflow-hidden">
              {visible.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block px-4 py-4 transition hover:bg-[var(--input-bg-focus)]"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {item.category && <CategoryBadge category={item.category} t={t} />}
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {item.source}
                        {item.publishedAt ? ` · ${formatRelativeTime(item.publishedAt, t)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <h3
                        className={`flex-1 font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent-blue)] transition line-clamp-2 ${
                          index === 0 ? "text-[16px] md:text-[17px]" : "text-[14px]"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{item.summary}</p>
                  </a>
                </li>
              ))}
            </ul>

            {filtered.length > VISIBLE_COUNT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full rounded-xl border border-[var(--border)] py-2.5 text-[13px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue)]/8 hover:bg-[var(--accent-blue)]/12 transition"
              >
                {expanded ? t("home_newsShowLess") : t("home_newsShowMore", String(filtered.length - VISIBLE_COUNT))}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
