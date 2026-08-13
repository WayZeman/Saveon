"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CategoryKind } from "@/lib/assets-catalog";
import { FieldLabel } from "@/components/Modal";

export type PickedAsset = {
  symbol: string;
  name: string;
  class: string;
};

type Props = {
  kind: CategoryKind;
  value: PickedAsset | null;
  onChange: (asset: PickedAsset | null) => void;
  label: string;
  placeholder: string;
};

export function AssetPicker({ kind, value, onChange, label, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PickedAsset[]>([]);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/assets?class=${kind}&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.assets)) setItems(data.assets);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 220 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, query]);

  useEffect(() => {
    if (!value) {
      setPriceUsd(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/assets/price?symbol=${encodeURIComponent(value.symbol)}&class=${encodeURIComponent(value.class)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.priceUsd === "number") setPriceUsd(data.priceUsd);
      })
      .catch(() => {
        if (!cancelled) setPriceUsd(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const visible = useMemo(() => items.slice(0, 12), [items]);

  return (
    <div ref={boxRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium truncate">{value.name}</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              {value.symbol}
              {priceUsd != null ? ` · $${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(true);
            }}
            className="icon-btn"
            aria-label="Очистити"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full !pl-10"
            placeholder={placeholder}
            autoComplete="off"
          />
        </div>
      )}
      {open && !value && (
        <ul className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-modal">
          {loading && visible.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-[var(--text-tertiary)]">Шукаємо…</li>
          )}
          {visible.map((asset) => (
            <li key={`${asset.class}-${asset.symbol}`}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--input-bg)] transition"
                onClick={() => {
                  onChange(asset);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="block text-[14px] font-medium">{asset.symbol}</span>
                <span className="block text-[12px] text-[var(--text-tertiary)] truncate">{asset.name}</span>
              </button>
            </li>
          ))}
          {!loading && visible.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-[var(--text-tertiary)]">Нічого не знайдено</li>
          )}
        </ul>
      )}
    </div>
  );
}
