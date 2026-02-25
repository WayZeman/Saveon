"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
        setMode("login");
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
    <div className="min-h-screen min-h-[100dvh] flex items-center sm:justify-center p-5 bg-[var(--bg)] relative overflow-auto">
      <div className="relative w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-[22px] overflow-hidden mb-5 shadow-glow">
            <img
              src="/logo.png"
              alt="Saveon"
              width={68}
              height={68}
              className="object-cover"
            />
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text)]">
            {isRegister ? t("auth_createAccount") : isRecovery ? "Відновлення пароля" : t("auth_welcomeBack")}
          </h1>
        </div>
      </div>
    </div>
  );
}
