"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, Mail, Lock, User, Check, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Mode = "login" | "register" | "recovery";

const PASSWORD_MIN = 6;

function getPasswordStrength(pw: string, t: (k: string) => string): { level: number; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "" };
  if (pw.length < PASSWORD_MIN) return { level: 1, label: t("auth_strengthTooShort"), color: "var(--accent-red)" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 2, label: t("auth_strengthWeak"), color: "var(--accent-orange)" };
  if (score <= 2) return { level: 3, label: t("auth_strengthMedium"), color: "var(--accent-orange)" };
  return { level: 4, label: t("auth_strengthStrong"), color: "var(--accent-green)" };
}

export default function AuthPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [confirmRecoveryCode, setConfirmRecoveryCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password, t), [password, t]);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const recoveryCodesMatch = confirmRecoveryCode.length === 0 || recoveryCode === confirmRecoveryCode;
  const recoveryCodeValid = /^\d{4}$/.test(recoveryCode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (!name.trim()) { setError(t("auth_errorName")); return; }
      if (password.length < PASSWORD_MIN) { setError(t("auth_errorPasswordMin", String(PASSWORD_MIN))); return; }
      if (password !== confirmPassword) { setError(t("auth_errorPasswordsMatch")); return; }
      if (!/^\d{4}$/.test(recoveryCode)) { setError(t("auth_errorRecoveryCodeLength")); return; }
      if (recoveryCode !== confirmRecoveryCode) { setError(t("auth_errorRecoveryCodeMatch")); return; }
      if (!agreed) { setError(t("auth_errorAgree")); return; }
    }

    if (mode === "recovery") {
      if (!recoveryCodeValid) { setError(t("auth_errorRecoveryCodeLength")); return; }
      if (password.length < PASSWORD_MIN) { setError(t("auth_errorPasswordMin", String(PASSWORD_MIN))); return; }
    }

    if (!email.trim() || !password.trim()) { setError(t("auth_errorFillFields")); return; }
    const emailTrimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setError(t("auth_errorInvalidEmail")); return; }

    setLoading(true);
    try {
      let endpoint = "/api/auth/login";
      if (mode === "register") endpoint = "/api/auth/register";
      if (mode === "recovery") endpoint = "/api/auth/reset-password";

      const body = mode === "login"
        ? { email: emailTrimmed, password }
        : mode === "register"
          ? { name: name.trim(), email: emailTrimmed, password, recoveryCode }
          : { email: emailTrimmed, recoveryCode, newPassword: password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: { error?: string; needLogin?: boolean } = {};
      try { data = await res.json(); } catch { setError(t("auth_errorServer")); return; }
      if (!res.ok) { setError(data.error ?? t("auth_errorGeneric")); return; }
      if (data.needLogin) {
        setError(data.error ?? "Дія завершена. Увійдіть.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setRecoveryCode("");
        setConfirmRecoveryCode("");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("auth_errorConnection"));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    if (mode === "login") setMode("register");
    else setMode("login");
    setError("");
    setRecoveryCode("");
    setConfirmRecoveryCode("");
  }

  const isRegister = mode === "register";
  const isRecovery = mode === "recovery";
  const isLogin = mode === "login";

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center sm:justify-center p-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] bg-[var(--bg)] relative overflow-auto">
      <div className="relative w-full max-w-[420px] animate-in">
        {/* Logo & heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-[22px] overflow-hidden mb-5 shadow-glow">
            <Image src="/logo.png" alt="Saveon" width={68} height={68} className="object-cover" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text)]">
            {isRegister ? t("auth_createAccount") : isRecovery ? "Відновлення пароля" : t("auth_welcomeBack")}
          </h1>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            {isRegister ? t("auth_startControlling") : isRecovery ? "Введіть email та код відновлення" : t("auth_signInToContinue")}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-[var(--bg-elevated)]/80 backdrop-blur-xl border border-[var(--border)] p-6 sm:p-7 shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name (register only) */}
            {isRegister && (
              <div className="animate-slide-up">
                <label htmlFor="name" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                  {t("auth_yourName")}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  <input
                    id="name" type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full !pl-11"
                    placeholder={t("auth_namePlaceholder")}
                    autoComplete="given-name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                {t("auth_email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full !pl-11"
                  placeholder={t("auth_emailPlaceholder")}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Recovery Code (recovery only) */}
            {isRecovery && (
              <div className="animate-slide-up">
                <label htmlFor="recoveryCode" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                  {t("auth_recoveryCode")}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  <input
                    id="recoveryCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full !pl-11"
                    placeholder={t("auth_recoveryCodePlaceholder")}
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password / New Password */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                {isRecovery ? "Новий пароль" : t("auth_password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full !pl-11 !pr-12"
                  placeholder={isLogin ? t("auth_enterPassword") : t("auth_passwordPlaceholder")}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors rounded-lg"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-[16px] h-[16px]" /> : <Eye className="w-[16px] h-[16px]" />}
                </button>
              </div>

              {/* Password strength (register/recovery) */}
              {(isRegister || isRecovery) && password.length > 0 && (
                <div className="mt-2.5 animate-slide-up">
                  <div className="flex gap-1.5 mb-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-[3px] flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= strength.level ? strength.color : "var(--input-bg)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password (register only) */}
            {isRegister && (
              <div className="animate-slide-up">
                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                  {t("auth_confirmPassword")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full !pl-11 ${!passwordsMatch ? "!border-[var(--accent-red)] focus:!border-[var(--accent-red)]" : ""}`}
                    placeholder={t("auth_repeatPassword")}
                    autoComplete="new-password"
                    required
                  />
                  {confirmPassword.length > 0 && passwordsMatch && (
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent-green)]" strokeWidth={2.5} />
                  )}
                </div>
                {!passwordsMatch && (
                  <p className="text-[11px] text-[var(--accent-red)] mt-1.5 ml-0.5">{t("auth_errorPasswordsMatch")}</p>
                )}
              </div>
            )}

            {/* Код для відновлення пароля (register only) */}
            {isRegister && (
              <>
                <div className="animate-slide-up">
                  <label htmlFor="recoveryCode" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                    {t("auth_recoveryCode")}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                    <input
                      id="recoveryCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full !pl-11"
                      placeholder={t("auth_recoveryCodePlaceholder")}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>
                <div className="animate-slide-up">
                  <label htmlFor="confirmRecoveryCode" className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-0.5">
                    {t("auth_recoveryCodeConfirm")}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[var(--text-tertiary)]" strokeWidth={1.5} />
                    <input
                      id="confirmRecoveryCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmRecoveryCode}
                      onChange={(e) => setConfirmRecoveryCode(e.target.value.replace(/\D/g, ""))}
                      className={`w-full !pl-11 ${!recoveryCodesMatch && confirmRecoveryCode.length > 0 ? "!border-[var(--accent-red)] focus:!border-[var(--accent-red)]" : ""}`}
                      placeholder={t("auth_recoveryCodePlaceholder")}
                      autoComplete="one-time-code"
                      required
                    />
                    {confirmRecoveryCode.length > 0 && recoveryCodesMatch && recoveryCodeValid && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent-green)]" strokeWidth={2.5} />
                    )}
                  </div>
                  {!recoveryCodesMatch && confirmRecoveryCode.length > 0 && (
                    <p className="text-[11px] text-[var(--accent-red)] mt-1.5 ml-0.5">{t("auth_errorRecoveryCodeMatch")}</p>
                  )}
                </div>
              </>
            )}

            {/* Terms (register only) */}
            {isRegister && (
              <label className="flex items-start gap-3 cursor-pointer pt-1 animate-slide-up">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[13px] text-[var(--text-secondary)] leading-snug">
                  {t("auth_agreeTermsText")}
                </span>
              </label>
            )}

            {/* Forgot password link (login only) */}
            {isLogin && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setMode("recovery")}
                  className="text-[13px] font-medium text-[var(--accent-blue)] hover:underline"
                >
                  Забули пароль?
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 px-4 py-3 animate-slide-up">
                <p className="text-[13px] text-[var(--accent-red)] text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (isRegister && (!agreed || !recoveryCodeValid || recoveryCode !== confirmRecoveryCode))}
              className="w-full rounded-xl bg-[var(--accent-blue)] text-white font-semibold text-[15px] py-3.5 hover:brightness-110 disabled:opacity-40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-glow !mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? t("auth_register") : isRecovery ? "Скинути пароль" : t("auth_login")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wider">{t("auth_or")}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Switch mode */}
          <button
            type="button"
            onClick={switchMode}
            className="w-full rounded-xl border border-[var(--border)] py-3 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text)] active:scale-[0.98] transition-all"
          >
            {isRegister || isRecovery ? t("auth_switchToLogin") : t("auth_switchToRegister")}
          </button>
        </div>
      </div>
    </div>
  );
}
