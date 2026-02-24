"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, CheckboxField, useConfirm } from "@/components/Modal";

type Category = { id: string; name: string; isShared: boolean; userId: string | null; _count?: { transactions: number } };

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<{ partnerId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([u, list]) => {
        setUser(u);
        setCategories(list);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError(t("categories_errorName")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isShared }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("categories_errorGeneric")); return; }
      setCategories((prev) => [data, ...prev]);
      closeModal();
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
    } catch { setError(t("categories_errorConnection")); }
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

  if (loading) return <Loader />;

  const shared = categories.filter((c) => c.isShared);
  const personal = categories.filter((c) => !c.isShared);
  const showModal = modal || !!editCat;

  return (
    <div className="section-spacing max-w-5xl mx-auto">
      <div className="flex justify-between items-center gap-4 opacity-0 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-[var(--accent-blue)]" strokeWidth={1.5} />
            {t("categories_title")}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
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

      <CategoryList title={t("categories_shared")} items={shared} onEdit={openEdit} onDelete={handleDelete} delay={1} emptyText={t("categories_emptyShared")} />
      <CategoryList title={t("categories_my")} items={personal} onEdit={openEdit} onDelete={handleDelete} delay={2} emptyText={t("categories_emptyPersonal")} />

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

function CategoryList({ title, items, onEdit, onDelete, delay, emptyText }: {
  title: string;
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  delay: number;
  emptyText?: string;
}) {
  return (
    <section className={`card opacity-0 animate-slide-up animate-stagger-${delay}`}>
      <h2 className="text-[15px] font-semibold mb-3 text-[var(--text-secondary)]">{title}</h2>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3.5 group">
            <span className="text-[14px] font-medium">{c.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--text-tertiary)]">{c._count?.transactions ?? 0} тр.</span>
              <button type="button" onClick={() => onEdit(c)} className="icon-btn sm:opacity-0 sm:group-hover:opacity-100">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => onDelete(c)} className="icon-btn hover:text-[var(--accent-red)] sm:opacity-0 sm:group-hover:opacity-100">
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
