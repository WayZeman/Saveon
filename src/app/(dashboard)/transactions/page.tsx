"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Transaction, type Category } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, SegmentedControl, useConfirm } from "@/components/Modal";

export default function TransactionsPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { transactions, categories, initialLoadDone, setTransactions, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ amount: "", type: "income" as "income" | "expense", categoryId: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const MAX_AMOUNT = 999_999_999.99;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !form.categoryId) { setError(t("transactions_errorAmountCategory")); return; }
    if (amount > MAX_AMOUNT) { setError(t("transactions_errorAmountTooBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: form.type, categoryId: form.categoryId }),
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
    if (amount > MAX_AMOUNT) { setError(t("transactions_errorAmountTooBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: form.type, categoryId: form.categoryId }),
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
    setForm({ amount: "", type: "income", categoryId: "" });
  }
  function openEdit(t: Transaction) {
    setEditTx(t); setError("");
    setForm({ amount: String(t.amount), type: t.type as "income" | "expense", categoryId: t.categoryId });
  }
  function closeModal() {
    setModal(false); setEditTx(null); setError("");
    setForm({ amount: "", type: "income", categoryId: "" });
  }

  if (!initialLoadDone) return <Loader />;

  const showModal = modal || !!editTx;

  return (
    <div className="section-spacing max-w-5xl mx-auto">
      <div className="flex justify-between items-center gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-[var(--accent-blue)]" strokeWidth={1.5} />
            {t("transactions_title")}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">{t("transactions_subtitle")}</p>
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
            <li key={tx.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-5 py-3.5 hover:bg-[var(--input-bg)] group transition-colors opacity-0 animate-slide-up" style={{ animationDelay: `${0.05 + i * 0.03}s` }}>
              <div className="min-w-0 flex items-center gap-3">
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "income" ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"}`}>
                  {tx.type === "income" ? <ArrowUpRight className="w-4 h-4" strokeWidth={2} /> : <ArrowDownLeft className="w-4 h-4" strokeWidth={2} />}
                </span>
                <div>
                  <p className="text-[14px] font-medium truncate">{tx.category.name}</p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("uk-UA")} · {tx.type === "income" ? t("transactions_income") : t("transactions_expense")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                <span className={`shrink-0 text-[15px] font-semibold ${tx.type === "income" ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                  {tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount)}
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(tx)} className="icon-btn sm:opacity-0 sm:group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handleDelete(tx)} className="icon-btn hover:text-[var(--accent-red)] sm:opacity-0 sm:group-hover:opacity-100">
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
                  onChange={(v) => setForm((f) => ({ ...f, type: v }))}
                />
              </div>
              <div>
                <FieldLabel>{t("transactions_category")}</FieldLabel>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
                  <option value="">{t("transactions_selectCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isShared ? ` (${t("transactions_shared")})` : ""}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>{t("transactions_amount")}</FieldLabel>
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
