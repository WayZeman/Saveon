"use client";

import { useState } from "react";
import type { Category } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions } from "@/components/Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export type RealizeGoalInfo = {
  id: string;
  title: string;
  targetAmount: number;
  sourceCategories?: { id: string; name: string }[];
};

type Props = {
  goal: RealizeGoalInfo;
  categories: Category[];
  onClose: () => void;
  onConfirm: (sourceCategoryId: string) => Promise<boolean>;
};

export function RealizeGoalModal({ goal, categories, onClose, onConfirm }: Props) {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!sourceCategoryId) {
      setError(t("transactions_errorSourceCategory"));
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onConfirm(sourceCategoryId);
      if (!ok) setError(t("goals_errorGeneric"));
    } catch {
      setError(t("goals_errorConnection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalPanel title={t("goals_realizeTitle")} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-[14px] text-[var(--text-secondary)]">
            {t("goals_realizeHint", goal.title, formatMoney(goal.targetAmount))}
          </p>
          <div>
            <FieldLabel>{t("transactions_sourceCategory")}</FieldLabel>
            <select
              value={sourceCategoryId}
              onChange={(e) => setSourceCategoryId(e.target.value)}
              required
            >
              <option value="">{t("transactions_selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && <FieldError message={error} />}
          <ModalActions
            onCancel={onClose}
            submitLabel={submitting ? "..." : t("home_realize")}
            submitDisabled={submitting}
          />
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}
