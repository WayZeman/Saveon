"use client";

import { useEffect, useState } from "react";
import { getStoredLang, translate, type Lang } from "@/lib/translations";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>("uk");
  useEffect(() => {
    console.error(error);
    setLang(getStoredLang());
  }, [error]);

  const t = (key: string) => translate(lang, key);
  return (
    <html lang={lang}>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f1116", color: "#f3f5f8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ maxWidth: "460px", width: "100%", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(20,24,33,0.9)", backdropFilter: "blur(20px)", padding: "28px", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 640, marginBottom: "0.5rem" }}>{t("error_title")}</h1>
          <p style={{ color: "#b1b8c4", marginBottom: "1.5rem", textAlign: "center" }}>
            {t("error_message")}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              background: "#0a84ff",
              color: "white",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("error_retry")}
          </button>
        </div>
      </body>
    </html>
  );
}
