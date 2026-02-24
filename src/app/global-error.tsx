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
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0c0c10", color: "#f2f2f7", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t("error_title")}</h1>
        <p style={{ color: "#8e8e9e", marginBottom: "1.5rem", textAlign: "center" }}>
          {t("error_message")}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            background: "#6366f1",
            color: "white",
            border: "none",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t("error_retry")}
        </button>
      </body>
    </html>
  );
}
