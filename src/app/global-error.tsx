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
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          background: "#000000",
          color: "#ffffff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          letterSpacing: "-0.015em",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            borderRadius: "22px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#111111",
            padding: "28px",
            textAlign: "center",
            boxShadow: "0 18px 48px rgba(0,0,0,0.55), 0 0 48px rgba(255,212,81,0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #ffd451, rgba(255,212,81,0.55))",
            }}
          />
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, marginBottom: "0.5rem", marginTop: "0.25rem" }}>
            {t("error_title")}
          </h1>
          <p style={{ color: "#a1a1a6", marginBottom: "1.5rem", textAlign: "center", lineHeight: 1.5 }}>
            {t("error_message")}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "14px",
              background: "#ffd451",
              color: "#0a0a0a",
              border: "none",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 0 48px rgba(255,212,81,0.18)",
            }}
          >
            {t("error_retry")}
          </button>
        </div>
      </body>
    </html>
  );
}
