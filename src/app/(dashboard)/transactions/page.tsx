"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Transaction, type Category } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, SegmentedControl, useConfirm } from "@/components/Modal";
import { AssetPicker, type PickedAsset } from "@/components/AssetPicker";
import { inferCategoryKind, type CategoryKind } from "@/lib/assets-catalog";

function marketKind(category: Category | undefined): "stock" | "crypto" | null {
  if (!category) return null;
  if (category.kind === "stock" || category.kind === "crypto") return category.kind;
  const inferred = inferCategoryKind(category.name);
  return inferred === "stock" || inferred === "crypto" ? inferred : null;
}

const emptyForm: {
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  sourceCategoryId: string;
  currency: Currency;
  asset: PickedAsset | null;
} = {
  amount: "",
  type: "income",
  categoryId: "",
  sourceCategoryId: "",
  currency: "UAH",
  asset: null,
};

export default function TransactionsPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { transactions, categories, initialLoadDone, setTransactions, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const MAX_AMOUNT = 999_999_999.99;
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedSource = categories.find((c) => c.id === form.sourceCategoryId);
  const assetKind = form.type === "expense" ? marketKind(selectedSource) : marketKind(selectedCategory);

  function assetPayload() {
    if (!form.asset) return {};
    return {
      assetSymbol: form.asset.symbol,
      assetName: form.asset.name,
      assetClass: form.asset.class,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !form.categoryId) { setError(t("transactions_errorAmountCategory")); return; }
    if (form.type === "expense" && !form.sourceCategoryId) { setError(t("transactions_errorSourceCategory")); return; }
    if (assetKind && !form.asset) { setError(t("transactions_assetRequired")); return; }
    if (amount > MAX_AMOUNT) { setError(t("transactions_errorAmountTooBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: form.type,
          categoryId: form.categoryId,
          ...(form.type === "expense" ? { sourceCategoryId: form.sourceCategoryId } : {}),
          currency: form.currency,
          ...assetPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("transactions_errorGeneric")); return; }
      setTransactions((prev) => [data, ...prev]);
      closeModal();
      await invalidateAfterMutation("transaction");
    } catch { setError(t("transactions_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTx) return;
    setError("");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !form.categoryId) { setError(t("transactions_errorAmountCategory")); return; }
    if (form.type === "expense" && !form.sourceCategoryId) { setError(t("transactions_errorSourceCategory")); return; }
    if (assetKind && !form.asset) { setError(t("transactions_assetRequired")); return; }
    if (amount > MAX_AMOUNT) { setError(t("transactions_errorAmountTooBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: form.type,
          categoryId: form.categoryId,
          ...(form.type === "expense" ? { sourceCategoryId: form.sourceCategoryId } : {}),
          ...assetPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("transactions_errorGeneric")); return; }
      setTransactions((prev) => prev.map((tx) => (tx.id === editTx.id ? data : tx)));
      setEditTx(null);
      await invalidateAfterMutation("transaction");
    } catch { setError(t("transactions_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(tr: Transaction) {
    const ok = await confirm(t("transactions_confirmDelete"));
    if (!ok) return;
    try {
      const res = await fetch(`/api/transactions/${tr.id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((x) => x.id !== tr.id));
        await invalidateAfterMutation("transaction");
      }
    } catch { /* ignore */ }
  }

  function openCreate() {
    setModal(true); setEditTx(null); setError("");
    setForm(emptyForm);
  }
  function openEdit(tx: Transaction) {
    setEditTx(tx); setError("");
    setForm({
      amount: String(tx.amount),
      type: tx.type as "income" | "expense",
      categoryId: tx.categoryId,
      sourceCategoryId: tx.sourceCategoryId ?? "",
      currency: "UAH",
      asset: tx.assetSymbol
        ? { symbol: tx.assetSymbol, name: tx.assetName || tx.assetSymbol, class: tx.assetClass || "stock" }
        : null,
    });
  }
  function closeModal() {
    setModal(false); setEditTx(null); setError("");
    setForm(emptyForm);
  }

  const currencyOptions: { value: Currency; labelKey: string }[] = [
    { value: "UAH", labelKey: "transactions_currencyUah" },
    { value: "USD", labelKey: "transactions_currencyUsd" },
    { value: "EUR", labelKey: "transactions_currencyEur" },
  ];

  if (!initialLoadDone) return <Loader />;

  const showModal = modal || !!editTx;

  return (
    <div className="section-spacing max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet className="w-7 h-7 text-[var(--accent-blue)]" strokeWidth={1.5} />
            {t("transactions_title")}
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">{t("transactions_subtitle")}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {t("transactions_add")}
        </button>
      </div>

      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-1">
        <ul className="divide-y divide-[var(--border)]">
          {transactions.length === 0 ? (
            <li className="p-10 text-center text-[var(--text-secondary)] text-[14px]">{t("transactions_none")}</li>
          ) : transactions.map((tx, i) => (
            <li key={tx.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-5 py-4 hover:bg-[var(--input-bg)] group transition-colors opacity-0 animate-slide-up" style={{ animationDelay: `${0.05 + i * 0.03}s` }}>
              <div className="min-w-0 flex items-center gap-3">
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "income" ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"}`}>
                  {tx.type === "income" ? <ArrowUpRight className="w-4 h-4" strokeWidth={2} /> : <ArrowDownLeft className="w-4 h-4" strokeWidth={2} />}
                </span>
                <div>
                  <p className="text-[14px] font-medium truncate">
                    {tx.assetName || tx.assetSymbol
                      ? `${tx.assetName || tx.assetSymbol} · ${tx.type === "expense" && tx.sourceCategory ? t("transactions_fromCategory", tx.sourceCategory.name) : tx.category.name}`
                      : tx.type === "expense" && tx.sourceCategory
                        ? `${tx.category.name} · ${t("transactions_fromCategory", tx.sourceCategory.name)}`
                        : tx.category.name}
                  </p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("uk-UA")} · {tx.type === "income" ? t("transactions_income") : t("transactions_expense")}
                    {tx.unitPriceUsd != null ? ` · $${tx.unitPriceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                <span className={`shrink-0 text-[15px] font-semibold ${tx.type === "income" ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                  {tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount)}
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(tx)} className="icon-btn icon-btn-edit sm:opacity-0 sm:group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handleDelete(tx)} className="icon-btn icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {confirmDialog}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <ModalPanel title={editTx ? t("transactions_edit") : t("transactions_new")} onClose={closeModal}>
            <form onSubmit={editTx ? handleEdit : handleSubmit} className="space-y-5">
              <div>
                <FieldLabel>{t("transactions_type")}</FieldLabel>
                <SegmentedControl
                  options={[{ value: "income" as const, label: t("transactions_income") }, { value: "expense" as const, label: t("transactions_expense") }]}
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v, sourceCategoryId: v === "income" ? "" : f.sourceCategoryId, asset: null }))}
                />
              </div>
              <div>
                <FieldLabel>{form.type === "expense" ? t("transactions_expenseCategory") : t("transactions_category")}</FieldLabel>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, asset: f.type === "income" ? null : f.asset }))}
                  required
                >
                  <option value="">{t("transactions_selectCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isShared ? ` (${t("transactions_shared")})` : ""}</option>)}
                </select>
              </div>
              {form.type === "expense" && (
                <div>
                  <FieldLabel>{t("transactions_sourceCategory")}</FieldLabel>
                  <select
                    value={form.sourceCategoryId}
                    onChange={(e) => setForm((f) => ({ ...f, sourceCategoryId: e.target.value, asset: null }))}
                    required
                  >
                    <option value="">{t("transactions_selectSourceCategory")}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isShared ? ` (${t("transactions_shared")})` : ""}</option>)}
                  </select>
                </div>
              )}
              {assetKind && (
                <AssetPicker
                  kind={assetKind as CategoryKind}
                  value={form.asset}
                  onChange={(asset) => setForm((f) => ({ ...f, asset }))}
                  label={assetKind === "crypto" ? t("transactions_assetCrypto") : t("transactions_assetStocks")}
                  placeholder={assetKind === "crypto" ? t("transactions_assetPlaceholderCrypto") : t("transactions_assetPlaceholderStocks")}
                />
              )}
              {!editTx && (
                <div>
                  <FieldLabel>{t("transactions_currency")}</FieldLabel>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}>
                    {currencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <FieldLabel>{t("transactions_amount")}{!editTx && form.currency !== "UAH" ? ` (${form.currency})` : ""}</FieldLabel>
                <input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              </div>
              {error && <FieldError message={error} />}
              <ModalActions onCancel={closeModal} submitLabel={t("modal_save")} submitDisabled={submitting} />
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-[var(--text-secondary)] rounded-full animate-spin" />
    </div>
  );
}
