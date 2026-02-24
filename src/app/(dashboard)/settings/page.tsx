"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Sun, Moon, Monitor, ChevronRight, Palette,
  CircleDollarSign, LifeBuoy, Heart, LogOut, ExternalLink, Check,
  Users, UserPlus, UserMinus, Loader2,
} from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ModalOverlay, ModalPanel, FieldLabel, FieldError, ModalActions, useConfirm } from "@/components/Modal";

type User = { id: string; name: string | null; email: string; role: string; partnerId: string | null } | null;
type Partner = { id: string; email: string; role: string } | null;

const currencySymbols: Record<Currency, string> = { UAH: "₴", USD: "$", EUR: "€" };

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [user, setUser] = useState<User>(null);
  const [partner, setPartner] = useState<Partner>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [addPartnerModal, setAddPartnerModal] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerRole, setPartnerRole] = useState<"husband" | "wife" | "friend">("husband");
  const [partnerError, setPartnerError] = useState("");
  const [partnerSaving, setPartnerSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const themes = [
    { value: "light" as Theme, labelKey: "settings_themeLight" as const, Icon: Sun },
    { value: "dark" as Theme, labelKey: "settings_themeDark" as const, Icon: Moon },
    { value: "system" as Theme, labelKey: "settings_themeSystem" as const, Icon: Monitor },
  ];
  const currencies = [
    { value: "UAH" as Currency, labelKey: "settings_currencyUah" as const, symbol: "₴" },
    { value: "USD" as Currency, labelKey: "settings_currencyUsd" as const, symbol: "$" },
    { value: "EUR" as Currency, labelKey: "settings_currencyEur" as const, symbol: "€" },
  ];

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser).catch(() => setUser(null));
    fetch("/api/partner").then((r) => r.json()).then((d) => setPartner(d.partner)).catch(() => setPartner(null)).finally(() => setPartnerLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function toggle(section: string) {
    setExpandedSection(expandedSection === section ? null : section);
  }

  async function handleAddPartner(e: React.FormEvent) {
    e.preventDefault();
    setPartnerError("");
    const emailTrimmed = partnerEmail.trim();
    if (!emailTrimmed) { setPartnerError(t("settings_errorEmail")); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setPartnerError(t("settings_errorInvalidEmail")); return; }
    setPartnerSaving(true);
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, role: partnerRole }),
      });
      const data = await res.json();
      if (!res.ok) { setPartnerError(data.error ?? t("auth_errorGeneric")); return; }
      setPartner(data.partner);
      setAddPartnerModal(false);
      setPartnerEmail("");
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser);
    } catch { setPartnerError(t("auth_errorConnection")); }
    finally { setPartnerSaving(false); }
  }

  async function handleRemovePartner() {
    const ok = await confirm(t("settings_confirmRemovePartner"));
    if (!ok) return;
    try {
      const res = await fetch("/api/partner", { method: "DELETE" });
      if (res.ok) {
        setPartner(null);
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser);
      }
    } catch { /* ignore */ }
  }

  const roleLabel = (role: string) => role === "husband" ? t("settings_roleHusband") : role === "wife" ? t("settings_roleWife") : role === "friend" ? t("settings_roleFriend") : "User";
  const roleInitial = (role: string) => role === "husband" ? "Ч" : role === "wife" ? "Д" : role === "friend" ? "Д" : "?";

  return (
    <div className="section-spacing max-w-2xl mx-auto">
      <div className="opacity-0 animate-slide-up">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-[var(--text-secondary)]" strokeWidth={1.5} />
          {t("settings_title")}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">{t("settings_subtitle")}</p>
      </div>

      {/* Profile */}
      {user && (
        <div className="card opacity-0 animate-slide-up animate-stagger-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center text-[18px] font-bold text-white">
              {user.name ? user.name[0].toUpperCase() : roleInitial(user.role)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-semibold truncate">{user.name || roleLabel(user.role)}</p>
              <p className="text-[13px] text-[var(--text-secondary)] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Partner */}
      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-2">
        {partnerLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : partner ? (
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
                <Users className="w-4 h-4 text-white" strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium">{t("settings_partner")}</p>
                <p className="text-[12px] text-[var(--text-tertiary)]">{partner.email} · {roleLabel(partner.role)}</p>
              </div>
              <button type="button" onClick={handleRemovePartner} className="p-2 rounded-lg text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors" title={t("settings_removePartner")}>
                <UserMinus className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAddPartnerModal(true); setPartnerError(""); setPartnerEmail(""); }}
            className="w-full flex items-center gap-3 px-5 py-4 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" strokeWidth={2} />
            </span>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-medium">{t("settings_addPartner")}</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">{t("settings_addPartnerHint")}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        )}
      </div>

      {/* Appearance */}
      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-3">
        <button type="button" onClick={() => toggle("theme")} className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" strokeWidth={2} />
          </span>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-medium">{t("settings_theme")}</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">{themes.find((x) => x.value === theme) ? t(themes.find((x) => x.value === theme)!.labelKey) : t("settings_themeDark")}</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${expandedSection === "theme" ? "rotate-90" : ""}`} />
        </button>
        {expandedSection === "theme" && (
          <div className="px-5 pb-4 animate-slide-up">
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, labelKey, Icon }) => (
                <button key={value} type="button" onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl text-[13px] font-medium transition-all duration-200 border ${theme === value ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-[var(--border)] mx-5" />

        <button type="button" onClick={() => toggle("currency")} className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-teal)] flex items-center justify-center">
            <CircleDollarSign className="w-4 h-4 text-white" strokeWidth={2} />
          </span>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-medium">{t("settings_currency")}</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">{currencies.find((c) => c.value === currency) ? t(currencies.find((c) => c.value === currency)!.labelKey) : ""} ({currencySymbols[currency] ?? currency})</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${expandedSection === "currency" ? "rotate-90" : ""}`} />
        </button>
        {expandedSection === "currency" && (
          <div className="px-5 pb-4 animate-slide-up">
            <div className="space-y-1">
              {currencies.map(({ value, labelKey, symbol }) => (
                <button key={value} type="button" onClick={() => setCurrency(value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currency === value ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]" : "text-[var(--text-secondary)]"}`}
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-[15px] font-semibold">{symbol}</span>
                  <span className="flex-1 text-left text-[14px] font-medium">{t(labelKey)}</span>
                  {currency === value && <Check className="w-4 h-4" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Support */}
      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-5">
        <a href="https://t.me/familefinance" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-teal)] flex items-center justify-center"><LifeBuoy className="w-4 h-4 text-white" strokeWidth={2} /></span>
          <div className="flex-1 text-left"><p className="text-[14px] font-medium">{t("settings_support")}</p><p className="text-[12px] text-[var(--text-tertiary)]">{t("settings_supportTelegram")}</p></div>
          <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
        </a>
        <div className="h-px bg-[var(--border)] mx-5" />
        <a href="https://send.monobank.ua/jar/4znkD4kdM5" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-orange)] flex items-center justify-center"><Heart className="w-4 h-4 text-white" strokeWidth={2} /></span>
          <div className="flex-1 text-left"><p className="text-[14px] font-medium">{t("settings_supportProject")}</p><p className="text-[12px] text-[var(--text-tertiary)]">{t("settings_supportJar")}</p></div>
          <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
        </a>
      </div>

      {/* Logout */}
      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-6">
        <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-[var(--accent-red)]/10 flex items-center justify-center"><LogOut className="w-4 h-4 text-[var(--accent-red)]" strokeWidth={2} /></span>
          <span className="text-[14px] font-medium text-[var(--accent-red)]">{t("settings_logout")}</span>
        </button>
      </div>

      <p className="text-center text-[12px] text-[var(--text-tertiary)] pb-4">Saveon v0.2.0</p>

      {confirmDialog}

      {/* Add partner modal */}
      {addPartnerModal && (
        <ModalOverlay onClose={() => setAddPartnerModal(false)}>
          <ModalPanel title={t("settings_addPartnerModal")} onClose={() => setAddPartnerModal(false)}>
            <form onSubmit={handleAddPartner} className="space-y-5">
              <div>
                <FieldLabel>{t("settings_partnerEmail")}</FieldLabel>
                <input type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} placeholder="partner@example.com" required />
              </div>
              <div>
                <FieldLabel>{t("settings_partnerRole")}</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "husband" as const, labelKey: "settings_roleHusband" as const, color: "var(--accent-blue)" },
                    { value: "wife" as const, labelKey: "settings_roleWife" as const, color: "var(--accent-purple)" },
                    { value: "friend" as const, labelKey: "settings_roleFriend" as const, color: "var(--accent-green)" },
                  ]).map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setPartnerRole(opt.value)}
                      className={`py-3 rounded-xl text-[14px] font-medium transition-all duration-200 border ${partnerRole === opt.value ? `border-[${opt.color}] bg-[${opt.color}]/10 text-[${opt.color}]` : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                      style={partnerRole === opt.value ? { borderColor: opt.color, background: `color-mix(in srgb, ${opt.color} 10%, transparent)`, color: opt.color } : undefined}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              {partnerError && <FieldError message={partnerError} />}
              <ModalActions onCancel={() => setAddPartnerModal(false)} submitLabel={partnerSaving ? t("settings_adding") : t("modal_add")} submitDisabled={partnerSaving} />
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}
    </div>
  );
}
