"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Transaction } from "@/contexts/DataContext";
import { FieldError, useConfirm } from "@/components/Modal";
import { AddTransactionModal } from "@/components/AddTransactionModal";

export default function TransactionsPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { transactions, categories, initialLoadDone, setTransactions, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleDelete(tr: Transaction) {
    const ok = await confirm(t("transactions_confirmDelete"));
    if (!ok) return;
    try {
      const res = await fetch(`/api/transactions/${tr.id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("transactions_errorGeneric"));
        return;
      }
      setError("");
      setTransactions((prev) => prev.filter((x) => x.id !== tr.id));
      await invalidateAfterMutation("transaction");
    } catch {
      setError(t("transactions_errorConnection"));
    }
  }

  function openCreate() {
    setModal(true);
    setEditTx(null);
    setError("");
  }
  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setError("");
  }
  function closeModal() {
    setModal(false);
    setEditTx(null);
  }

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

      {error && !showModal && <FieldError message={error} />}

      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-1">
        <ul className="divide-y divide-[var(--border)]">
          {transactions.length === 0 ? (
            <li className="p-10 text-center text-[var(--text-secondary)] text-[14px]">{t("transactions_none")}</li>
          ) : (
            transactions.map((tx, i) => (
              <li
                key={tx.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-5 py-4 hover:bg-[var(--input-bg)] group transition-colors opacity-0 animate-slide-up"
                style={{ animationDelay: `${0.05 + i * 0.03}s` }}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "income" ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"}`}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" strokeWidth={2} />
                    )}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium truncate">
                      {tx.type === "expense" && tx.sourceCategory
                        ? `${tx.category.name} · ${t("transactions_fromCategory", tx.sourceCategory.name)}`
                        : tx.category.name}
                    </p>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString("uk-UA")} ·{" "}
                      {tx.type === "income" ? t("transactions_income") : t("transactions_expense")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                  <span
                    className={`shrink-0 text-[15px] font-semibold ${tx.type === "income" ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(tx)}
                      className="icon-btn icon-btn-edit sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx)}
                      className="icon-btn icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {confirmDialog}
      <AddTransactionModal
        open={showModal}
        onClose={closeModal}
        categories={categories}
        editTx={editTx}
        onSaved={async (data, kind) => {
          const tx = data as Transaction;
          if (kind === "create") setTransactions((prev) => [tx, ...prev]);
          else setTransactions((prev) => prev.map((row) => (row.id === tx.id ? tx : row)));
          await invalidateAfterMutation("transaction");
        }}
      />
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
