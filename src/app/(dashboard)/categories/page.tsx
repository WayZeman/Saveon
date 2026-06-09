"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FolderTree, ArrowDown, ArrowUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData, type Category } from "@/contexts/DataContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, CheckboxField, useConfirm } from "@/components/Modal";
import { filterPrimaryCategories, isPrimaryCategory, oppositeTier, type CategoryTier } from "@/lib/category-tier";

export default function CategoriesPage() {
  const { t } = useLanguage();
  const { categories, user, initialLoadDone, setCategories, invalidateAfterMutation } = useData();
  const [modal, setModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError(t("categories_errorName")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isShared, tier: "primary" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("categories_errorGeneric")); return; }
      setCategories((prev) => [data, ...prev]);
      closeModal();
      await invalidateAfterMutation("category");
    } catch { setError(t("categories_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    setError("");
    if (!name.trim()) { setError(t("categories_errorName")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${editCat.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isShared: editCat.isShared }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("categories_errorGeneric")); return; }
      setCategories((prev) => prev.map((c) => (c.id === editCat.id ? data : c)));
      closeModal();
      await invalidateAfterMutation("category");
    } catch { setError(t("categories_errorConnection")); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(c: Category) {
    const ok = await confirm(t("categories_confirmDelete", c.name));
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? t("categories_errorGeneric")); return; }
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      await invalidateAfterMutation("category");
    } catch { setError(t("categories_errorConnection")); }
  }

  async function handleMoveTier(c: Category) {
    if (movingId) return;
    const nextTier = oppositeTier((c.tier ?? "primary") as CategoryTier);
    setMovingId(c.id);
    setError("");
    try {
      const res = await fetch(`/api/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: nextTier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("categories_errorGeneric")); return; }
      setCategories((prev) => prev.map((x) => (x.id === c.id ? data : x)));
      await invalidateAfterMutation("category");
    } catch { setError(t("categories_errorConnection")); }
    finally { setMovingId(null); }
  }

  const hasPartner = !!user?.partnerId;

  function openCreate() {
    setModal(true); setEditCat(null); setError("");
    setName(""); setIsShared(hasPartner);
  }
  function openEdit(c: Category) {
    setEditCat(c); setError("");
    setName(c.name);
  }
  function closeModal() {
    setModal(false); setEditCat(null); setError("");
    setName(""); setIsShared(hasPartner);
  }

  if (!initialLoadDone) return <Loader />;

  const primary = filterPrimaryCategories(categories);
  const secondary = categories.filter((c) => !isPrimaryCategory(c));
  const showModal = modal || !!editCat;

  return (
    <div className="section-spacing max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-[var(--accent-blue)]" strokeWidth={1.5} />
            {t("categories_title")}
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            {t("categories_subtitle")}
            {!hasPartner && t("categories_addPartnerHint")}
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {t("categories_add")}
        </button>
      </div>

      {error && !showModal && (
        <FieldError message={error} />
      )}

      <CategoryList
        title={t("categories_primary")}
        items={primary}
        onMove={handleMoveTier}
        onEdit={openEdit}
        onDelete={handleDelete}
        moveLabel={t("categories_moveToSecondary")}
        moveIcon="down"
        movingId={movingId}
        hasPartner={hasPartner}
        delay={1}
        emptyText={t("categories_emptyPrimary")}
      />
      <CategoryList
        title={t("categories_secondary")}
        items={secondary}
        onMove={handleMoveTier}
        onEdit={openEdit}
        onDelete={handleDelete}
        moveLabel={t("categories_moveToPrimary")}
        moveIcon="up"
        movingId={movingId}
        hasPartner={hasPartner}
        delay={2}
        emptyText={t("categories_emptySecondary")}
      />

      {confirmDialog}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <ModalPanel title={editCat ? t("categories_edit") : t("categories_new")} onClose={closeModal}>
            <form onSubmit={editCat ? handleEdit : handleSubmit} className="space-y-5">
              <div>
                <FieldLabel>{t("categories_name")}</FieldLabel>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Наприклад: Їжа, Готівка" required />
              </div>
              {!editCat && hasPartner && (
                <CheckboxField checked={isShared} onChange={setIsShared} label={t("categories_sharedLabel")} />
              )}
              {error && <FieldError message={error} />}
              <ModalActions onCancel={closeModal} submitLabel={editCat ? t("modal_save") : t("modal_add")} submitDisabled={submitting} />
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}
    </div>
  );
}

function CategoryList({
  title,
  items,
  onMove,
  onEdit,
  onDelete,
  moveLabel,
  moveIcon,
  movingId,
  hasPartner,
  delay,
  emptyText,
}: {
  title: string;
  items: Category[];
  onMove: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  moveLabel: string;
  moveIcon: "up" | "down";
  movingId: string | null;
  hasPartner: boolean;
  delay: number;
  emptyText?: string;
}) {
  const { t } = useLanguage();
  const MoveIcon = moveIcon === "down" ? ArrowDown : ArrowUp;

  return (
    <section className={`card opacity-0 animate-slide-up animate-stagger-${delay}`}>
      <h2 className="text-[15px] font-semibold mb-3 text-[var(--text-secondary)]">{title}</h2>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3.5 group">
            <button
              type="button"
              onClick={() => onMove(c)}
              disabled={movingId === c.id}
              className="flex-1 min-w-0 text-left rounded-lg -my-1 py-1 px-1 hover:bg-[var(--input-bg)] transition disabled:opacity-60"
              title={moveLabel}
            >
              <span className="text-[14px] font-medium block truncate">{c.name}</span>
              {hasPartner && (
                <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 block">
                  {c.isShared ? t("categories_sharedBadge") : t("categories_personalBadge")}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onMove(c)}
                disabled={movingId === c.id}
                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-60"
                title={moveLabel}
              >
                <MoveIcon className="w-4 h-4" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => onEdit(c)} className="icon-btn icon-btn-edit sm:opacity-0 sm:group-hover:opacity-100">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => onDelete(c)} className="icon-btn icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && emptyText && (
          <li className="py-8 text-center text-[var(--text-tertiary)] text-[14px]">{emptyText}</li>
        )}
      </ul>
    </section>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-[var(--text-secondary)] rounded-full animate-spin" />
    </div>
  );
}
