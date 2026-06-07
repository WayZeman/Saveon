"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { ModalOverlay, FieldError } from "@/components/Modal";
import { useLanguage } from "@/contexts/LanguageContext";

export type IncomingInvitePayload = {
  id: string;
  recipientRole: string;
  createdAt: string;
  fromUser: { id: string; name: string; email: string };
};

export function PartnerInviteModal({
  invite,
  onResolved,
}: {
  invite: IncomingInvitePayload;
  onResolved: () => void;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState("");

  const roleLabel = (role: string) =>
    role === "husband" ? t("settings_roleHusband") : role === "wife" ? t("settings_roleWife") : t("settings_roleFriend");

  async function respond(action: "accept" | "reject") {
    setError("");
    setLoading(action);
    try {
      const res = await fetch(`/api/partner/invite/${invite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("auth_errorGeneric"));
        return;
      }
      onResolved();
    } catch {
      setError(t("auth_errorConnection"));
    } finally {
      setLoading(null);
    }
  }

  const displayName = invite.fromUser.name?.trim() || invite.fromUser.email;

  return (
    <ModalOverlay onClose={() => {}}>
      <div
        className="glass-modal rounded-2xl w-full max-w-[440px] max-h-[82dvh] shadow-modal animate-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-0 sm:px-7 sm:pt-7 shrink-0">
          <h2 className="text-[18px] font-semibold tracking-tight pr-2">{t("partnerInvite_title")}</h2>
        </div>
        <div className="px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7 overflow-y-auto flex-1 min-h-0 space-y-5">
          <div className="flex items-start gap-3">
            <span className="icon-badge w-10 h-10 rounded-xl shrink-0">
              <Users className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                <span className="font-semibold text-[var(--text)]">{displayName}</span>{" "}
                {t("partnerInvite_body")}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
                {t("partnerInvite_roleHint")}: <strong>{roleLabel(invite.recipientRole)}</strong>
              </p>
            </div>
          </div>
          {error && <FieldError message={error} />}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => respond("reject")}
              className="btn-secondary px-4 py-2.5 text-[14px] disabled:opacity-50"
            >
              {loading === "reject" ? "…" : t("partnerInvite_reject")}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => respond("accept")}
              className="btn-primary px-4 py-2.5 text-[14px] disabled:opacity-50"
            >
              {loading === "accept" ? "…" : t("partnerInvite_accept")}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
