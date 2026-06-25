"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PROFILE_EMOJI_GROUPS } from "@/lib/profile-avatar";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type EmojiAvatarPickerProps = {
  open: boolean;
  onClose: () => void;
  name?: string | null;
  role: string;
  currentEmoji?: string | null;
  onSelect: (emoji: string | null) => void;
  saving?: boolean;
};

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
}

export function EmojiAvatarPicker({
  open,
  onClose,
  name,
  role,
  currentEmoji,
  onSelect,
  saving = false,
}: EmojiAvatarPickerProps) {
  const { t } = useLanguage();
  const [previewEmoji, setPreviewEmoji] = useState<string | null>(currentEmoji ?? null);

  useEffect(() => {
    if (!open) return;
    setPreviewEmoji(currentEmoji ?? null);
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open, currentEmoji]);

  if (!open || typeof document === "undefined") return null;

  const sheet = (
    <div
      className="emoji-picker-overlay fixed inset-0 z-[200] flex items-end justify-center bg-[var(--overlay-bg)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="emoji-picker-sheet w-full max-w-lg rounded-t-[1.35rem] shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("profileEmoji_title")}
      >
        <div className="emoji-picker-handle" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h2 className="text-[17px] font-semibold tracking-tight">{t("profileEmoji_title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--input-bg)] hover:bg-[var(--input-bg-focus)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col items-center px-5 pb-4">
          <ProfileAvatar
            name={name}
            role={role}
            avatarEmoji={previewEmoji}
            size={88}
          />
          <p className="text-[13px] text-[var(--text-secondary)] mt-3 text-center">
            {t("profileEmoji_hint")}
          </p>
        </div>

        <div className="emoji-picker-scroll px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[min(52dvh,420px)] overflow-y-auto">
          {PROFILE_EMOJI_GROUPS.map((group) => (
            <EmojiGroup key={group.id} title={t(group.labelKey)}>
              {group.emojis.map((emoji) => (
                <EmojiCell
                  key={emoji}
                  emoji={emoji}
                  selected={previewEmoji === emoji}
                  disabled={saving}
                  onPick={() => {
                    setPreviewEmoji(emoji);
                    onSelect(emoji);
                  }}
                />
              ))}
            </EmojiGroup>
          ))}

          {currentEmoji ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setPreviewEmoji(null);
                onSelect(null);
              }}
              className="w-full mt-2 mb-1 py-3 rounded-[0.85rem] text-[14px] font-medium text-[var(--accent-red)] bg-[var(--accent-red)]/8 hover:bg-[var(--accent-red)]/12 transition-colors disabled:opacity-50"
            >
              {t("profileEmoji_remove")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}

function EmojiGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2 px-0.5">
        {title}
      </h3>
      <div className="grid grid-cols-6 gap-2">{children}</div>
    </section>
  );
}

function EmojiCell({
  emoji,
  selected,
  disabled,
  onPick,
}: {
  emoji: string;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`emoji-picker-cell aspect-square rounded-2xl text-[26px] leading-none flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${
        selected
          ? "emoji-picker-cell--selected"
          : "bg-[var(--input-bg)] hover:bg-[var(--input-bg-focus)]"
      }`}
      aria-label={emoji}
      aria-pressed={selected}
    >
      {emoji}
    </button>
  );
}
