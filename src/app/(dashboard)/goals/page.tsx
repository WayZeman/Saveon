"use client";

import { useState } from "react";
import { Target, Plus, Pencil, Trash2, XCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Goal } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, CheckboxField, useConfirm } from "@/components/Modal";
import { RealizeGoalModal } from "@/components/RealizeGoalModal";
import { GoalCard } from "@/components/GoalCard";
import { GoalsSummary } from "@/components/GoalsSummary";
import { filterPrimaryCategories } from "@/lib/category-tier";
import { formatGoalDeadlineInput } from "@/lib/goal-dates";

type GoalForm = {
  title: string;
  targetAmount: string;
  description: string;
  deadline: string;
  isShared: boolean;
  sourceCategoryIds: string[];
};

const emptyForm = (isShared: boolean): GoalForm => ({
  title: "",
  targetAmount: "",
  description: "",
  deadline: "",
  isShared,
  sourceCategoryIds: [],
});

export default function GoalsPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { goals, dashboardData, user, categories, initialLoadDone, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [realizeGoal, setRealizeGoal] = useState<Goal | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm(true));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const MAX_AMOUNT = 999_999_999.99;

  function getGoalDisplay(goal: Goal) {
    const dashGoal = dashboardData?.goals.find((g) => g.id === goal.id);
    if (dashGoal) {
      return {
        balanceUsed: dashGoal.balanceUsed,
        remainingNeeded: dashGoal.remainingNeeded,
        progressPercent: dashGoal.progressPercent,
      };
    }
    return { balanceUsed: 0, remainingNeeded: goal.targetAmount, progressPercent: 0 };
  }

  function setSourceCategory(categoryId: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      sourceCategoryIds: checked
        ? f.sourceCategoryIds.includes(categoryId)
          ? f.sourceCategoryIds
          : [...f.sourceCategoryIds, categoryId]
        : f.sourceCategoryIds.filter((id) => id !== categoryId),
    }));
  }

  function goalSourceCategoryIds(goal: Goal): string[] {
    return (goal.sourceCategories ?? []).map((c) => c.id);
  }

  async function refreshAfterGoalAction() {
    await invalidateAfterMutation("goal");
  }

  function goalPayloadFromForm() {
    const target = parseFloat(form.targetAmount.replace(",", "."));
    return {
      title: form.title.trim(),
      targetAmount: target,
      description: form.description.trim() || undefined,
      deadline: form.deadline || null,
      isShared: form.isShared,
      sourceCategoryIds: form.sourceCategoryIds,
    };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = goalPayloadFromForm();
    if (!payload.title || !Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) {
      setError(t("goals_errorFill"));
      return;
    }
    if (payload.targetAmount > MAX_AMOUNT) { setError(t("goals_errorAmountBig")); return; }
    if (form.sourceCategoryIds.length === 0) { setError(t("goals_errorSourceCategories")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("goals_errorGeneric")); return; }
      closeModal();
      await refreshAfterGoalAction();
      if (data.id) setExpandedGoalId(data.id);
    } catch { setError(t("goals_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal) return;
    setError("");
    const payload = goalPayloadFromForm();
    if (!payload.title || !Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) {
      setError(t("goals_errorFill"));
      return;
    }
    if (payload.targetAmount > MAX_AMOUNT) { setError(t("goals_errorAmountBig")); return; }
    if (form.sourceCategoryIds.length === 0) { setError(t("goals_errorSourceCategories")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${editGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("goals_errorGeneric")); return; }
      closeModal();
      await refreshAfterGoalAction();
      setExpandedGoalId(editGoal.id);
    } catch { setError(t("goals_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleSaveDetails(
    goalId: string,
    data: { description?: string | null; deadline?: string | null }
  ) {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) await refreshAfterGoalAction();
  }

  async function handleDelete(goal: Goal) {
    const ok = await confirm(t("goals_confirmDelete", goal.title));
    if (!ok) return;
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedGoalId === goal.id) setExpandedGoalId(null);
        await refreshAfterGoalAction();
      }
    } catch { /* ignore */ }
  }

  async function handleRealize(goal: Goal, realize: boolean, sourceCategoryId?: string) {
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(realize ? { realize: true, sourceCategoryId } : { realize: false }),
      });
      if (res.ok) {
        if (realize) setRealizeGoal(null);
        await refreshAfterGoalAction();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  const hasPartner = !!user?.partnerId;
  const primaryCategories = filterPrimaryCategories(categories);

  function openCreate() {
    setModal(true);
    setEditGoal(null);
    setError("");
    setForm(emptyForm(hasPartner));
  }

  async function openEdit(g: Goal) {
    setEditGoal(g);
    setError("");
    let sourceCategoryIds = goalSourceCategoryIds(g);
    let title = g.title;
    let targetAmount = String(g.targetAmount);
    let description = g.description ?? "";
    let deadline = formatGoalDeadlineInput(g.deadline);
    let isShared = hasPartner ? g.isShared : false;
    try {
      const res = await fetch(`/api/goals/${g.id}`);
      if (res.ok) {
        const fresh: Goal = await res.json();
        sourceCategoryIds = goalSourceCategoryIds({ ...fresh, sourceCategories: fresh.sourceCategories ?? [] });
        title = fresh.title;
        targetAmount = String(fresh.targetAmount);
        description = fresh.description ?? "";
        deadline = formatGoalDeadlineInput(fresh.deadline);
        isShared = hasPartner ? fresh.isShared : false;
        setEditGoal({ ...fresh, sourceCategories: fresh.sourceCategories ?? [] });
      }
    } catch { /* use list data */ }
    setForm({ title, targetAmount, description, deadline, isShared, sourceCategoryIds });
  }

  function closeModal() {
    setModal(false);
    setEditGoal(null);
    setError("");
    setForm(emptyForm(hasPartner));
  }

  if (!initialLoadDone) return <Loader />;

  const showModal = modal || !!editGoal;
  const activeGoals = goals.filter((g) => !g.realizedAt);
  const realizedGoals = goals.filter((g) => !!g.realizedAt);
  const summary = dashboardData?.goalsSummary;
  const accents = ["blue", "purple", "teal"] as const;

  return (
    <div className="section-spacing max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Target className="w-7 h-7 text-[var(--accent-purple)]" strokeWidth={1.5} />
            {t("goals_title")}
          </h1>
          <div className="text-[14px] text-[var(--text-secondary)] mt-1">
            <p>{t("goals_subtitle")}</p>
            {!hasPartner && <p className="mt-0.5">{t("goals_addPartnerHint").trim()}</p>}
          </div>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {t("goals_newGoal")}
        </button>
      </div>

      {activeGoals.length > 0 && summary && (
        <GoalsSummary
          totalTarget={summary.totalTarget}
          totalCollected={summary.totalCollected}
          totalRemaining={summary.totalRemaining}
          fillPercent={summary.fillPercent}
          activeCount={activeGoals.length}
          formatMoney={formatMoney}
          t={t}
        />
      )}

      {activeGoals.length > 0 ? (
        <div className="space-y-3 opacity-0 animate-slide-up" style={{ animationDelay: "0.08s" }}>
          {activeGoals.map((goal, i) => {
            const canEdit = !!(user && (goal.createdBy === user.id || goal.isShared));
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                display={getGoalDisplay(goal)}
                accent={accents[i % accents.length]}
                expanded={expandedGoalId === goal.id}
                onToggle={() => setExpandedGoalId((id) => (id === goal.id ? null : goal.id))}
                canEdit={canEdit}
                formatMoney={formatMoney}
                t={t}
                onEdit={() => void openEdit(goal)}
                onDelete={() => void handleDelete(goal)}
                onRealize={() => setRealizeGoal(goal)}
                onSaveDetails={(data) => handleSaveDetails(goal.id, data)}
              />
            );
          })}
        </div>
      ) : (
        <section className="card text-center py-14 opacity-0 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--input-bg)] border border-[var(--border)]">
            <Target className="w-7 h-7 text-[var(--accent-purple)]" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold">{t("home_noGoals")}</h2>
          <p className="mt-1.5 text-[14px] text-[var(--text-secondary)] max-w-sm mx-auto">{t("home_noGoalsHint")}</p>
          <button type="button" onClick={openCreate} className="btn-primary mt-6 mx-auto">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            {t("goals_newGoal")}
          </button>
        </section>
      )}

      {realizedGoals.length > 0 && (
        <div className="mt-10 opacity-0 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-[15px] font-semibold text-[var(--text-secondary)] mb-3">{t("goals_realizedTitle")}</h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden divide-y divide-[var(--border)]">
            {realizedGoals.map((goal) => {
              const canEditDelete = user && (goal.createdBy === user.id || goal.isShared);
              return (
                <div key={goal.id} className="px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[15px] truncate">{goal.title}</h3>
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        {formatMoney(goal.targetAmount)} · {goal.isShared ? t("goals_sharedShort") : t("goals_personal")}
                      </p>
                    </div>
                    <div className="relative z-[1] flex flex-col gap-2 w-full sm:w-auto sm:min-w-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] self-start">
                        {t("goals_realized")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRealize(goal, false)}
                          className="flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none rounded-lg px-3 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition inline-flex items-center justify-center gap-1.5 min-h-[44px]"
                          title={t("goals_undo")}
                        >
                          <XCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
                          <span className="text-[12px] font-medium">{t("goals_undo")}</span>
                        </button>
                        {canEditDelete && (
                          <>
                            <button
                              type="button"
                              onClick={() => void openEdit(goal)}
                              className="flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none rounded-lg px-3 py-2.5 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition inline-flex items-center justify-center gap-1.5 min-h-[44px]"
                              title={t("goals_edit")}
                            >
                              <Pencil className="w-4 h-4 shrink-0" strokeWidth={2} />
                              <span className="text-[12px] font-medium">{t("goals_edit")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(goal)}
                              className="flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none rounded-lg px-3 py-2.5 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition inline-flex items-center justify-center gap-1.5 min-h-[44px]"
                              title={t("goals_delete")}
                            >
                              <Trash2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                              <span className="text-[12px] font-medium">{t("goals_delete")}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmDialog}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <ModalPanel title={editGoal ? t("goals_editGoal") : t("goals_newGoal")} onClose={closeModal}>
            <form onSubmit={editGoal ? handleEdit : handleAdd} className="space-y-5">
              <div>
                <FieldLabel>{t("goals_name")}</FieldLabel>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t("goals_namePlaceholder")}
                  required
                />
              </div>
              <div>
                <FieldLabel>{t("goals_targetAmount")}</FieldLabel>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <FieldLabel>{t("goals_description")}</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("goals_descriptionPlaceholder")}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-[14px]"
                />
              </div>
              <div>
                <FieldLabel>{t("goals_deadline")}</FieldLabel>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="goal-date-input"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <FieldLabel>{t("goals_sourceCategories")}</FieldLabel>
                  {categories.length > 0 && (
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      {t("goals_selectedCategories", String(form.sourceCategoryIds.length))}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--text-tertiary)] mb-2">{t("goals_sourceCategoriesHint")}</p>
                {primaryCategories.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-secondary)] rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3">
                    {t("goals_noCategoriesAvailable")}
                  </p>
                ) : (
                  <div className="space-y-1 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-3">
                    {primaryCategories.map((c) => (
                      <CheckboxField
                        key={c.id}
                        checked={form.sourceCategoryIds.includes(c.id)}
                        onChange={(checked) => setSourceCategory(c.id, checked)}
                        label={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              {hasPartner && (
                <CheckboxField
                  checked={form.isShared}
                  onChange={(v) => setForm((f) => ({ ...f, isShared: v }))}
                  label={t("goals_shared")}
                />
              )}
              {error && <FieldError message={error} />}
              <ModalActions
                onCancel={closeModal}
                submitLabel={editGoal ? t("modal_save") : t("modal_create")}
                submitDisabled={submitting}
              />
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}

      {realizeGoal && (
        <RealizeGoalModal
          goal={realizeGoal}
          categories={
            (realizeGoal.sourceCategories ?? []).length > 0
              ? primaryCategories.filter((c) => (realizeGoal.sourceCategories ?? []).some((s) => s.id === c.id))
              : primaryCategories
          }
          onClose={() => setRealizeGoal(null)}
          onConfirm={(sourceCategoryId) => handleRealize(realizeGoal, true, sourceCategoryId)}
        />
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
