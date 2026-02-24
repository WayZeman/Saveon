"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-2xl font-semibold mb-2">{t("error_title")}</h1>
      <p className="text-[var(--text-secondary)] mb-6 text-center">
        {t("error_message")}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-[var(--accent-blue)] text-white px-6 py-3 font-medium hover:opacity-90"
      >
        {t("error_retry")}
      </button>
    </div>
  );
}
