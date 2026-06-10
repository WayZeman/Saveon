"use client";

import { useEffect } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function syncAppHeight() {
  const root = document.documentElement;
  if (isStandalone()) {
    root.style.setProperty("--app-height", "100vh");
  } else {
    root.style.removeProperty("--app-height");
  }
}

export function PwaViewport() {
  useEffect(() => {
    const root = document.documentElement;

    const applyStandalone = () => {
      if (isStandalone()) {
        root.classList.add("pwa-standalone");
        syncAppHeight();
      } else {
        root.classList.remove("pwa-standalone");
        root.style.removeProperty("--app-height");
      }
    };

    applyStandalone();

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", applyStandalone);
    window.addEventListener("resize", syncAppHeight);
    window.visualViewport?.addEventListener("resize", syncAppHeight);

    return () => {
      mq.removeEventListener("change", applyStandalone);
      window.removeEventListener("resize", syncAppHeight);
      window.visualViewport?.removeEventListener("resize", syncAppHeight);
    };
  }, []);

  return null;
}
