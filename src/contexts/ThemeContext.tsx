"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "system";

type ContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "dark" | "light";
};

const ThemeContext = createContext<ContextValue | null>(null);

const STORAGE_KEY = "family-fin-theme";

function getStored(): Theme {
  // За замовчуванням — системна тема, поки користувач явно не вибере іншу
  if (typeof window === "undefined") return "system";
  const s = localStorage.getItem(STORAGE_KEY);
  if (s === "dark" || s === "light" || s === "system") return s;
  return "system";
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${resolved}`);
  root.style.colorScheme = resolved === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = getStored();
    setThemeState(stored);
    const res = stored === "system" ? getSystemTheme() : stored;
    setResolved(res);
    applyTheme(res);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const res = e.matches ? "light" : "dark";
      setResolved(res);
      applyTheme(res);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    const res = t === "system" ? getSystemTheme() : t;
    setResolved(res);
    applyTheme(res);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
