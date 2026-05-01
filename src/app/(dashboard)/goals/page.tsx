"use client";

import { useState } from "react";
import { Target, Plus, CheckCircle, Pencil, Trash2, XCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Goal } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, CheckboxField, useConfirm } from "@/components/Modal";

export default function GoalsPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { goals, dashboardData, user, initialLoadDone, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({ title: "", targetAmount: "", isShared: true });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const MAX_AMOUNT = 999_999_999.99;
  const balances = dashboardData ? { myBalance: dashboardData.myBalance, totalBalance: dashboardData.totalBalance } : null;

  function getGoalDisplay(goal: Goal) {
    if (!balances) return { balanceUsed: 0, remainingNeeded: goal.targetAmount, progressPercent: 0 };
    const balanceUsed = goal.isShared ? balances.totalBalance : balances.myBalance;
    const remainingNeeded = Math.max(0, goal.targetAmount - balanceUsed);
    const progressPercent = Math.min(100, (balanceUsed / goal.targetAmount) * 100);
    return { balanceUsed, remainingNeeded, progressPercent };
  }

  async function refreshAfterGoalAction() {
    await invalidateAfterMutation("goal");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const target = parseFloat(form.targetAmount.replace(",", "."));
    if (!form.title.trim() || !Number.isFinite(target) || target <= 0) { setError(t("goals_errorFill")); return; }
    if (target > MAX_AMOUNT) { setError(t("goals_errorAmountBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), targetAmount: target, isShared: form.isShared }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("goals_errorGeneric")); return; }
      closeModal();
      await refreshAfterGoalAction();
    } catch { setError(t("goals_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal) return;
    setError("");
    const target = parseFloat(form.targetAmount.replace(",", "."));
    if (!form.title.trim() || !Number.isFinite(target) || target <= 0) { setError(t("goals_errorFill")); return; }
    if (target > MAX_AMOUNT) { setError(t("goals_errorAmountBig")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${editGoal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), targetAmount: target, isShared: form.isShared }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("goals_errorGeneric")); return; }
      closeModal();
      await refreshAfterGoalAction();
    } catch { setError(t("goals_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(goal: Goal) {
    const ok = await confirm(t("goals_confirmDelete", goal.title));
    if (!ok) return;
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (res.ok) await refreshAfterGoalAction();
    } catch { /* ignore */ }
  }

  async function handleRealize(goal: Goal, realize: boolean) {
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realize }),
      });
      if (res.ok) await refreshAfterGoalAction();
    } catch { /* ignore */ }
  }

  const hasPartner = !!user?.partnerId;

  function openCreate() {
    setModal(true); setEditGoal(null); setError("");
    setForm({ title: "", targetAmount: "", isShared: hasPartner });
  }
  function openEdit(g: Goal) {
    setEditGoal(g); setError("");
    setForm({ title: g.title, targetAmount: String(g.targetAmount), isShared: hasPartner ? g.isShared : false });
  }
  function closeModal() {
    setModal(false); setEditGoal(null); setError("");
    setForm({ title: "", targetAmount: "", isShared: hasPartner });
  }

  if (!initialLoadDone) return <Loader />;

  const showModal = modal || !!editGoal;

  return (
    <div className="section-spacing max-w-5xl mx-auto">
      <div className="flex justify-between items-center gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Target className="w-7 h-7 text-[var(--accent-purple)]" strokeWidth={1.5} />
            {t("goals_title")}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {t("goals_subtitle")}
          {!hasPartner && t("goals_addPartnerHint")}
        </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {t("goals_newGoal")}
        </button>
      </div>

      {(() => {
        const activeGoals = goals.filter((g) => !g.realizedAt);
        const realizedGoals = goals.filter((g) => !!g.realizedAt);

        return (
          <>
            <div className="space-y-4">
              {activeGoals.map((goal, i) => {
                const { balanceUsed, remainingNeeded, progressPercent } = getGoalDisplay(goal);
                const canEditDelete = user && (goal.createdBy === user.id || goal.isShared);
                const hasEnough = remainingNeeded <= 0;
                return (
                  <div key={goal.id} className="card opacity-0 animate-slide-up" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-[17px]">{goal.title}</h2>
                          {hasEnough && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">Достатньо</span>}
                        </div>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1">{formatMoney(goal.targetAmount)} · {goal.isShared ? "спільна" : "особиста"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] text-[var(--text-tertiary)]">Залишилось зібрати</p>
                        <p className="text-[18px] font-semibold text-[var(--accent-blue)]">{formatMoney(remainingNeeded)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--border-strong)]">
                        <div className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-green)] rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <span className="text-[12px] text-[var(--text-tertiary)] shrink-0 font-medium">{progressPercent.toFixed(0)}%</span>
                    </div>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-2">На балансі {formatMoney(balanceUsed)} з {formatMoney(goal.targetAmount)}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                      <div>
                        {hasEnough && (
                          <button type="button" onClick={() => handleRealize(goal, true)} className="rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition inline-flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" strokeWidth={2} /> Реалізувати
                          </button>
                        )}
                      </div>
                      {canEditDelete && (
                        <div className="flex gap-2 ml-auto">
                          <button type="button" onClick={() => openEdit(goal)} className="rounded-lg p-2 md:px-3 md:py-2 text-[var(--accent-blue)] hover:bg-[var(--input-bg)] transition inline-flex items-center gap-1.5" title="Змінити">
                            <Pencil className="w-4 h-4 md:w-3.5 md:h-3.5" strokeWidth={2} />
                            <span className="hidden md:inline text-[13px] font-medium">Змінити</span>
                          </button>
                          <button type="button" onClick={() => handleDelete(goal)} className="rounded-lg p-2 md:px-3 md:py-2 text-[var(--accent-red)] hover:bg-[var(--input-bg)] transition inline-flex items-center gap-1.5" title="Видалити">
                            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" strokeWidth={2} />
                            <span className="hidden md:inline text-[13px] font-medium">Видалити</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {realizedGoals.length > 0 && (
              <div className="mt-10 opacity-0 animate-slide-up" style={{ animationDelay: `${0.05 + activeGoals.length * 0.06}s` }}>
                <h2 className="text-[15px] font-semibold text-[var(--text-secondary)] mb-3">Реалізовані</h2>
                <div className="flex flex-col gap-2">
                  {realizedGoals.map((goal) => {
                    const canEditDelete = user && (goal.createdBy === user.id || goal.isShared);
                    return (
                      <div key={goal.id} className="card py-3 border-[var(--accent-green)]/20">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium text-[15px] truncate">{goal.title}</h3>
                            <p className="text-[12px] text-[var(--text-tertiary)]">{formatMoney(goal.targetAmount)} · {goal.isShared ? "спільна" : "особиста"}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] mr-1">Реалізовано</span>
                            <button type="button" onClick={() => handleRealize(goal, false)} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition" title="Зняти">
                              <XCircle className="w-4 h-4" strokeWidth={2} />
                            </button>
                            {canEditDelete && (
                              <>
                                <button type="button" onClick={() => openEdit(goal)} className="rounded-lg p-2 text-[var(--accent-blue)] hover:bg-[var(--input-bg)] transition" title="Змінити">
                                  <Pencil className="w-4 h-4" strokeWidth={2} />
                                </button>
                                <button type="button" onClick={() => handleDelete(goal)} className="rounded-lg p-2 text-[var(--accent-red)] hover:bg-[var(--input-bg)] transition" title="Видалити">
                                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {confirmDialog}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <ModalPanel title={editGoal ? t("goals_editGoal") : t("goals_newGoal")} onClose={closeModal}>
            <form onSubmit={editGoal ? handleEdit : handleAdd} className="space-y-5">
              <div>
                <FieldLabel>{t("goals_name")}</FieldLabel>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t("goals_namePlaceholder")} required />
              </div>
              <div>
                <FieldLabel>{t("goals_targetAmount")}</FieldLabel>
                <input type="text" inputMode="decimal" value={form.targetAmount} onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))} placeholder="0.00" required />
              </div>
              {hasPartner && (
                <CheckboxField
                  checked={form.isShared}
                  onChange={(v) => setForm((f) => ({ ...f, isShared: v }))}
                  label={t("goals_shared")}
                />
              )}
              {error && <FieldError message={error} />}
              <ModalActions onCancel={closeModal} submitLabel={editGoal ? t("modal_save") : t("modal_create")} submitDisabled={submitting} />
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
