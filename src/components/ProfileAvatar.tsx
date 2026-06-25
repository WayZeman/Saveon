"use client";

import { profileAvatarGradient, profileAvatarInitial } from "@/lib/profile-avatar";

type ProfileAvatarProps = {
  name?: string | null;
  role: string;
  avatarEmoji?: string | null;
  size?: number;
  onClick?: () => void;
  className?: string;
  showEditHint?: boolean;
  ariaLabel?: string;
};

export function ProfileAvatar({
  name,
  role,
  avatarEmoji,
  size = 48,
  onClick,
  className = "",
  showEditHint = false,
  ariaLabel = "Змінити емоджі профілю",
}: ProfileAvatarProps) {
  const initial = profileAvatarInitial(name, role);
  const fontSize = Math.round(size * (avatarEmoji ? 0.52 : 0.38));
  const style = avatarEmoji
    ? { width: size, height: size, background: profileAvatarGradient(avatarEmoji) }
    : { width: size, height: size };

  const content = avatarEmoji ? (
    <span className="leading-none select-none" style={{ fontSize }} aria-hidden>
      {avatarEmoji}
    </span>
  ) : (
    <span className="font-bold text-white select-none" style={{ fontSize }}>
      {initial}
    </span>
  );

  const baseClass = avatarEmoji
    ? "rounded-full flex items-center justify-center shrink-0"
    : "rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center shrink-0";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`relative z-[1] cursor-pointer active:scale-95 transition-transform group ${baseClass} ${className}`}
        style={style}
        aria-label={ariaLabel}
      >
        {content}
        {showEditHint ? (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--text-secondary)] shadow-sm">
            ✎
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className={`${baseClass} ${className}`} style={style}>
      {content}
    </div>
  );
}
