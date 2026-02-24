"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type Lang, translate, getStoredLang } from "@/lib/translations";

const STORAGE_KEY = "family-fin-lang";

type ContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, ...args: string[]) => string;
};

const LanguageContext = createContext<ContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uk");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(getStoredLang());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, mounted]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, ...args: string[]) => translate(lang, key, ...args),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
