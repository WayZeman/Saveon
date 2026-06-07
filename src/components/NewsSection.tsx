"use client";

import { useEffect, useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
};

function formatNewsDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function NewsSection() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { items: NewsItem[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card opacity-0 animate-slide-up animate-stagger-6 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[17px] md:text-lg font-semibold flex items-center gap-2">
            <Newspaper className="w-[18px] h-[18px] text-[var(--accent-teal)]" strokeWidth={2} />
            {t("home_news")}
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{t("home_newsHint")}</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-3 animate-pulse">
              <div className="w-20 h-20 shrink-0 rounded-lg bg-[var(--surface-secondary)]" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-4/5 rounded bg-[var(--surface-secondary)]" />
                <div className="h-3 w-full rounded bg-[var(--surface-secondary)]/80" />
                <div className="h-3 w-2/3 rounded bg-[var(--surface-secondary)]/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="py-10 text-center text-[var(--text-tertiary)] text-[14px]">{t("home_newsError")}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-10 text-center text-[var(--text-tertiary)] text-[14px]">{t("home_newsEmpty")}</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--input-bg-focus)]"
              >
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-purple)]/20 border border-[var(--border)]">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--accent-teal)]">
                      <Newspaper className="w-7 h-7 opacity-70" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="text-[14px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent-blue)] transition line-clamp-2">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="mt-1.5 text-[13px] text-[var(--text-secondary)] line-clamp-2">{item.summary}</p>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    {item.source}
                    {item.publishedAt ? ` · ${formatNewsDate(item.publishedAt, "uk-UA")}` : ""}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
