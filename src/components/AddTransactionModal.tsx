"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, SegmentedControl } from "@/components/Modal";
import { lotFromTransaction } from "@/lib/cortex/infer-from-category";

type Currency = "UAH" | "USD" | "EUR";

export type AddTxCategory = { id: string; name: string; isShared?: boolean };

export type AddTxRecord = {
  id: string;
  amount: number;
  type: string;
  categoryId: string;
  sourceCategoryId: string | null;
};

const MAX_AMOUNT = 999_999_999.99;

const EMPTY_FORM = {
  amount: "",
  type: "income" as "income" | "expense",
  categoryId: "",
  sourceCategoryId: "",
  currency: "UAH" as Currency,
};

export function AddTransactionModal({
  open,
  onClose,
  categories,
  editTx = null,
  presetCategoryId,
  lockCategory = false,
  title,
  defaultType = "income",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: AddTxCategory[];
  editTx?: AddTxRecord | null;
  presetCategoryId?: string;
  lockCategory?: boolean;
  title?: string;
  defaultType?: "income" | "expense";
  onSaved?: (tx: unknown, kind: "create" | "update") => void | Promise<void>;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editTx) {
      setForm({
        amount: String(editTx.amount),
        type: editTx.type as "income" | "expense",
        categoryId: editTx.categoryId,
        sourceCategoryId: editTx.sourceCategoryId ?? "",
        currency: "UAH",
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      type: defaultType,
      categoryId: presetCategoryId ?? "",
    });
  }, [open, editTx, presetCategoryId, defaultType]);

  if (!open) return null;

  const destName = categories.find((c) => c.id === form.categoryId)?.name ?? "";
  const sourceName = categories.find((c) => c.id === form.sourceCategoryId)?.name ?? "";
  const willCreateCircle =
    !editTx &&
    Boolean(
      lotFromTransaction({
        type: form.type,
        categoryName: destName,
        sourceCategoryName: form.type === "expense" ? sourceName : null,
      }),
    );

  const currencyOptions: { value: Currency; labelKey: string }[] = [
    { value: "UAH", labelKey: "transactions_currencyUah" },
    { value: "USD", labelKey: "transactions_currencyUsd" },
    { value: "EUR", labelKey: "transactions_currencyEur" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !form.categoryId) {
      setError(t("transactions_errorAmountCategory"));
      return;
    }
    if (form.type === "expense" && !form.sourceCategoryId) {
      setError(t("transactions_errorSourceCategory"));
      return;
    }
    if (amount > MAX_AMOUNT) {
      setError(t("transactions_errorAmountTooBig"));
      return;
    }
    setSubmitting(true);
    try {
      const url = editTx ? `/api/transactions/${editTx.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: editTx ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          type: form.type,
          categoryId: form.categoryId,
          ...(form.type === "expense" ? { sourceCategoryId: form.sourceCategoryId } : {}),
          ...(!editTx ? { currency: form.currency } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("transactions_errorGeneric"));
        return;
      }
      await onSaved?.(data, editTx ? "update" : "create");
      onClose();
    } catch {
      setError(t("transactions_errorConnection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalPanel title={title ?? (editTx ? t("transactions_edit") : t("transactions_new"))} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel>{t("transactions_type")}</FieldLabel>
            <SegmentedControl
              options={[
                { value: "income" as const, label: t("transactions_income") },
                { value: "expense" as const, label: t("transactions_expense") },
              ]}
              value={form.type}
              onChange={(v) =>
                setForm((f) => ({ ...f, type: v, sourceCategoryId: v === "income" ? "" : f.sourceCategoryId }))
              }
            />
          </div>
          <div>
            <FieldLabel>{form.type === "expense" ? t("transactions_expenseCategory") : t("transactions_category")}</FieldLabel>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
              disabled={lockCategory && Boolean(presetCategoryId)}
            >
              <option value="">{t("transactions_selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isShared ? ` (${t("transactions_shared")})` : ""}
                </option>
              ))}
            </select>
          </div>
          {form.type === "expense" && (
            <div>
              <FieldLabel>{t("transactions_sourceCategory")}</FieldLabel>
              <select
                value={form.sourceCategoryId}
                onChange={(e) => setForm((f) => ({ ...f, sourceCategoryId: e.target.value }))}
                required
              >
                <option value="">{t("transactions_selectSourceCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isShared ? ` (${t("transactions_shared")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!editTx && (
            <div>
              <FieldLabel>{t("transactions_currency")}</FieldLabel>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {currencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <FieldLabel>
              {t("transactions_amount")}
              {!editTx && form.currency !== "UAH" ? ` (${form.currency})` : ""}
            </FieldLabel>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          {willCreateCircle && (
            <p className="text-[13px] text-[var(--text-secondary)] leading-5">{t("transactions_createsCircleHint")}</p>
          )}
          {error && <FieldError message={error} />}
          <ModalActions onCancel={onClose} submitLabel={t("modal_save")} submitDisabled={submitting} />
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}
