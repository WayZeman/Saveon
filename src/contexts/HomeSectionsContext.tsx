"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type HomeSectionsPrefs = {
  showFearGreed: boolean;
  showMarketNews: boolean;
};

type ContextValue = HomeSectionsPrefs & {
  setShowFearGreed: (value: boolean) => void;
  setShowMarketNews: (value: boolean) => void;
};

const STORAGE_KEY = "saveon-home-sections";

const DEFAULTS: HomeSectionsPrefs = {
  showFearGreed: true,
  showMarketNews: true,
};

function readStored(): HomeSectionsPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<HomeSectionsPrefs>;
    return {
      showFearGreed: parsed.showFearGreed ?? DEFAULTS.showFearGreed,
      showMarketNews: parsed.showMarketNews ?? DEFAULTS.showMarketNews,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeStored(prefs: HomeSectionsPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

const HomeSectionsContext = createContext<ContextValue | null>(null);

export function HomeSectionsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<HomeSectionsPrefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(readStored());
  }, []);

  const update = useCallback((patch: Partial<HomeSectionsPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  const setShowFearGreed = useCallback((value: boolean) => update({ showFearGreed: value }), [update]);
  const setShowMarketNews = useCallback((value: boolean) => update({ showMarketNews: value }), [update]);

  return (
    <HomeSectionsContext.Provider
      value={{
        showFearGreed: prefs.showFearGreed,
        showMarketNews: prefs.showMarketNews,
        setShowFearGreed,
        setShowMarketNews,
      }}
    >
      {children}
    </HomeSectionsContext.Provider>
  );
}

export function useHomeSections() {
  const ctx = useContext(HomeSectionsContext);
  if (!ctx) throw new Error("useHomeSections must be used within HomeSectionsProvider");
  return ctx;
}
