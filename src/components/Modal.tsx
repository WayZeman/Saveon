"use client";

import { type ReactNode, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] backdrop-blur-sm animate-in overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      onClick={onClose}
    >
      <div className="min-h-full w-full flex items-center justify-center p-4 py-8 sm:p-6">
        {children}
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

export function ModalPanel({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  return (
    <div
      className="glass-modal rounded-2xl w-full max-w-[440px] max-h-[82dvh] sm:max-h-[90dvh] shadow-modal animate-in flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-0 sm:px-7 sm:pt-7 sticky top-0 z-10 shrink-0">
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--input-bg)] hover:bg-[var(--input-bg-focus)] text-[var(--text-secondary)] transition-colors -mr-1"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
      <div className="px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7 overflow-y-auto flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
      {children}
    </label>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-[var(--accent-red)]/8 border border-[var(--accent-red)]/15 px-4 py-2.5">
      <p className="text-[13px] text-[var(--accent-red)]">{message}</p>
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel,
  submitDisabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitDisabled}
        className="flex-1 rounded-xl border border-[var(--border)] py-3 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {t("modal_cancel")}
      </button>
      <button
        type="submit"
        disabled={submitDisabled}
        className="flex-1 rounded-xl bg-[var(--accent-blue)] text-white py-3 text-[14px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-[var(--input-bg)] p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
            value === opt.value
              ? "bg-[var(--surface-secondary)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function CheckboxField({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-[14px] text-[var(--text-secondary)]">{label}</span>
    </label>
  );
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const confirmText = confirmLabel ?? t("modal_delete");
  const cancelText = cancelLabel ?? t("modal_cancel");
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--overlay-bg)] backdrop-blur-sm animate-in pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onClick={onCancel}
    >
      <div
        className="glass-modal rounded-2xl w-full max-w-[340px] shadow-modal animate-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-2">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-[var(--accent-red)]" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-[var(--text)] leading-snug">{message}</p>
        </div>
        <div className="flex border-t border-[var(--border)] mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 text-[14px] font-medium text-[var(--accent-blue)] hover:bg-[var(--input-bg)] transition-colors rounded-bl-2xl"
          >
            {cancelText}
          </button>
          <div className="w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3.5 text-[14px] font-semibold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/5 transition-colors rounded-br-2xl"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}

export function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      message={state.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
